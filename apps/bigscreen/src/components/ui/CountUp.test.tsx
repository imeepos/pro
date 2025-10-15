import { render, screen } from '@testing-library/react';
import CountUp from './CountUp';

describe('CountUp Component', () => {
  it('renders with initial value', () => {
    render(<CountUp end={100} data-testid="count-up" />);
    
    const element = screen.getByTestId('count-up');
    expect(element).toBeInTheDocument();
  });

  it('displays the final value', async () => {
    render(<CountUp end={42} duration={0.1} data-testid="count-up" />);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CountUp end={100} className="custom-class" data-testid="count-up" />);
    
    const element = screen.getByTestId('count-up');
    expect(element).toHaveClass('custom-class');
  });
});