import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeView } from './CodeView';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CodeView', () => {
  it('follow가 켜져 있으면 코드가 늘어날 때 맨 아래로 스크롤한다', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900);
    const { rerender } = render(<CodeView code="const A" follow />);

    rerender(<CodeView code={'const A = 1;\nconst B = 2;'} follow />);

    expect(screen.getByText(/const B/).closest('pre')!.scrollTop).toBe(900);
  });
});
