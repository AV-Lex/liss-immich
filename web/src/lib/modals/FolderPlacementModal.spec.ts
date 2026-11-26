import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { init, locale, register, waitLocale } from 'svelte-i18n';
import FolderPlacementModal from '$lib/modals/FolderPlacementModal.svelte';

describe('folder placement confirmation', () => {
  beforeAll(async () => {
    register('en-US', () => import('$i18n/en.json'));
    register('ru', () => import('$i18n/ru.json'));
    await init({ fallbackLocale: 'en-US', initialLocale: 'en-US' });
  });

  afterEach(async () => {
    cleanup();
    // Let the existing modal's deferred body-scroll cleanup finish before jsdom teardown.
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

  it.each([
    ['en-US', true, 'Enable folder placement', 'No', 'Files already placed there will stay where they are'],
    ['en-US', false, 'Yes, disable', 'No', 'Files already placed there will stay where they are'],
    ['ru', true, 'Включить размещение в папке', 'Нет', 'Уже размещённые файлы останутся на месте'],
    ['ru', false, 'Да, отключить', 'Нет', 'Уже размещённые файлы останутся на месте'],
  ] as const)(
    'shows %s confirmation for enabled=%s with inert refusal',
    async (language, enabled, confirmText, cancelText, preserved) => {
      await locale.set(language);
      await waitLocale(language);
      const onClose = vi.fn();
      const sut = render(FolderPlacementModal, { enabled, onClose });
      expect(sut.getByText(new RegExp(preserved))).toBeInTheDocument();
      await fireEvent.click(sut.getByRole('button', { name: cancelText }));
      expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
      onClose.mockClear();
      await fireEvent.click(sut.getByRole('button', { name: confirmText }));
      expect(onClose).toHaveBeenCalledExactlyOnceWith(true);
    },
  );

  it('closing or pressing Escape declines without confirming', async () => {
    await locale.set('en-US');
    await waitLocale('en-US');
    const onClose = vi.fn();
    const sut = render(FolderPlacementModal, { enabled: false, onClose });
    await fireEvent.click(sut.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
    onClose.mockClear();
    await fireEvent.keyDown(sut.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledExactlyOnceWith(false));
  });
});
