/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const ModalTestHarness: React.FC<{
  initialOpen?: boolean;
  title?: string;
  description?: string;
}> = ({ initialOpen = false, title = 'Test Modal', description = 'Test Description' }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div>
      <button data-testid="open-trigger" onClick={() => setIsOpen(true)}>
        Open Modal
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary">Confirm</Button>
          </>
        }
      >
        <div>
          <input data-testid="modal-input" placeholder="Enter text" />
          <p>Modal body content</p>
        </div>
      </Modal>
    </div>
  );
};

describe('Modal Accessibility and Interaction', () => {
  it('moves keyboard focus into the modal when opened and restores focus on close', async () => {
    render(<ModalTestHarness />);

    const trigger = screen.getByTestId('open-trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Check that an element inside the dialog has received focus
    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    // Press Escape to close modal
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Verify focus is restored to trigger
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps focus trapped inside the modal when pressing Tab and Shift+Tab', async () => {
    render(<ModalTestHarness initialOpen={true} />);

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });

    // Focus last element (confirm button) and press Tab -> should wrap to closeBtn
    confirmBtn.focus();
    expect(document.activeElement).toBe(confirmBtn);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

    // From first element (closeBtn), press Shift+Tab -> should wrap to confirmBtn
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);
  });

  it('closes on Escape key press', async () => {
    render(<ModalTestHarness initialOpen={true} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('prevents background body scrolling while open and restores it when closed', async () => {
    const { unmount } = render(<ModalTestHarness initialOpen={true} />);

    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('unset');
    });

    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });

  it('has accessible name and description bound via aria-labelledby and aria-describedby', () => {
    render(<ModalTestHarness initialOpen={true} title="Accessible Title" description="Accessible Desc" />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
    expect(screen.getByText('Accessible Title')).toHaveAttribute('id', 'modal-title');
    expect(screen.getByText('Accessible Desc')).toHaveAttribute('id', 'modal-description');
  });
});
