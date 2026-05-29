import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the ERP sign in screen', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});
