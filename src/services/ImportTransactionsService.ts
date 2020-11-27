import csvParse from 'csv-parse';
import { In, getRepository, getCustomRepository } from 'typeorm';
import fs from 'fs';
import Transaction from '../models/Transaction';
import TransacationRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'outcome' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const contactsReadStream = fs.createReadStream(filePath);
    const transactionsRepository = getCustomRepository(TransacationRepository);
    const categoryRepository = getRepository(Category);

    const parsers = csvParse({
      from_line: 2,
    });

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    const parseCSV = contactsReadStream.pipe(parsers);

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    console.log(transactions);
    console.log(categories);

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const categoriesToAdd = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    console.log(categoriesToAdd);

    const newCategories = categoryRepository.create(
      categoriesToAdd.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    console.log(finalCategories);

    const createdTransactions = transactionsRepository.create(
      transactions.map((transaction: CSVTransaction) => ({
        type: transaction.type,
        value: transaction.value,
        title: transaction.title,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
