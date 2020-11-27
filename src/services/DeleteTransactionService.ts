import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = await getCustomRepository(
      TransactionRepository,
    );

    const transaction = await transactionRepository.findOne(id);

    if (!transaction) {
      throw new AppError('this transaction does not exists');
    }

    await transactionRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
