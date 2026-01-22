import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Client Setup', () => {
    it('should pass basic math test', () => {
        expect(1 + 1).toBe(2);
    });

    it('virtual dom should work', () => {
        render(<div data-testid="test">Hello Vitest</div>);
        expect(screen.getByTestId('test')).toHaveTextContent('Hello Vitest');
    });
});
