import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface Transaction {
  id: number;
  transaction_type: string;
  weekday_change: number;
  weekend_change: number;
  description: string;
  created_at: string;
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/api/owner/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card">
      <h2>Transaction History (OWN-10)</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Weekday Change</th>
            <th>Weekend Change</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
              <td>{transaction.transaction_type}</td>
              <td style={{ color: transaction.weekday_change >= 0 ? 'green' : 'red' }}>
                {transaction.weekday_change >= 0 ? '+' : ''}{transaction.weekday_change}
              </td>
              <td style={{ color: transaction.weekend_change >= 0 ? 'green' : 'red' }}>
                {transaction.weekend_change >= 0 ? '+' : ''}{transaction.weekend_change}
              </td>
              <td>{transaction.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && <p>No transactions found</p>}
    </div>
  );
};

export default TransactionHistory;

