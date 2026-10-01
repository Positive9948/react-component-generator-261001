import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentCard } from './ComponentCard';

const component = {
  id: '1',
  prompt: '카드',
  code: 'render(<div>미리보기 결과</div>)',
  createdAt: new Date('2026-10-01T05:00:00Z'),
};

const renderCard = (autoRun: boolean) =>
  render(
    <ComponentCard
      component={component}
      onRemove={vi.fn()}
      onRegenerate={vi.fn()}
      isLoading={false}
      autoRun={autoRun}
    />,
  );

describe('ComponentCard', () => {
  it('autoRun이 false면 코드를 실행하지 않고 미리보기 실행 버튼을 보여준다', async () => {
    renderCard(false);

    expect(screen.getByRole('button', { name: '미리보기 실행' })).toBeInTheDocument();
    // react-live는 비동기로 렌더링하므로 잠시 기다려도 결과가 나오지 않는지 확인한다.
    await expect(screen.findByText('미리보기 결과', {}, { timeout: 300 })).rejects.toThrow();
  });

  it('미리보기 실행 버튼을 누르면 코드를 실행해 미리보기를 보여준다', async () => {
    const user = userEvent.setup();
    renderCard(false);

    await user.click(screen.getByRole('button', { name: '미리보기 실행' }));

    expect(await screen.findByText('미리보기 결과')).toBeInTheDocument();
  });
});
