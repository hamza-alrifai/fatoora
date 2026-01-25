import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
    it('renders correctly', () => {
        render(<Input placeholder="Enter text" />);
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('accepts user input', () => {
        render(<Input placeholder="Test" />);
        const input = screen.getByPlaceholderText('Test');

        fireEvent.change(input, { target: { value: 'Hello' } });
        expect(input).toHaveValue('Hello');
    });

    it('applies type attribute', () => {
        render(<Input type="number" placeholder="Number" />);
        const input = screen.getByPlaceholderText('Number');
        expect(input).toHaveAttribute('type', 'number');
    });

    it('can be disabled', () => {
        render(<Input disabled placeholder="Disabled" />);
        expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
    });

    it('forwards className', () => {
        render(<Input className="custom-class" placeholder="Custom" />);
        expect(screen.getByPlaceholderText('Custom')).toHaveClass('custom-class');
    });
});
