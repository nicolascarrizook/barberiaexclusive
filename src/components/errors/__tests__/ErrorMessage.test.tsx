import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('renders error message correctly', () => {
    render(<ErrorMessage message="Test error message" />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders with title when provided', () => {
    render(<ErrorMessage title="Error Title" message="Test error message" />);
    
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders with correct severity styles', () => {
    const { rerender } = render(
      <ErrorMessage message="Error" severity="error" />
    );
    
    let alert = screen.getByRole('alert');
    expect(alert).toHaveClass('destructive');

    rerender(<ErrorMessage message="Warning" severity="warning" />);
    alert = screen.getByRole('alert');
    expect(alert).not.toHaveClass('destructive');

    rerender(<ErrorMessage message="Info" severity="info" />);
    alert = screen.getByRole('alert');
    expect(alert).not.toHaveClass('destructive');
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorMessage message="Error" onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Reintentar');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<ErrorMessage message="Error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('✕');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows both retry and dismiss buttons when both handlers are provided', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    
    render(
      <ErrorMessage 
        message="Error" 
        onRetry={onRetry} 
        onDismiss={onDismiss} 
      />
    );
    
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('shows details when showDetails is true and details are provided', () => {
    render(
      <ErrorMessage 
        message="Error" 
        details="Detailed error information"
        showDetails={true}
      />
    );
    
    const detailsSummary = screen.getByText('Ver detalles');
    expect(detailsSummary).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(detailsSummary);
    
    expect(screen.getByText('Detailed error information')).toBeInTheDocument();
  });

  it('does not show details when showDetails is false', () => {
    render(
      <ErrorMessage 
        message="Error" 
        details="Detailed error information"
        showDetails={false}
      />
    );
    
    expect(screen.queryByText('Ver detalles')).not.toBeInTheDocument();
    expect(screen.queryByText('Detailed error information')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <ErrorMessage 
        message="Error" 
        className="custom-class"
      />
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });

  it('renders correct icon for each severity', () => {
    const { container, rerender } = render(
      <ErrorMessage message="Error" severity="error" />
    );
    
    // Error severity uses XCircle icon
    expect(container.querySelector('svg')).toBeInTheDocument();
    
    rerender(<ErrorMessage message="Warning" severity="warning" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    
    rerender(<ErrorMessage message="Info" severity="info" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});