import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Round1StoryBookModal from '../lobby/Round1StoryBookModal';

describe('Round1StoryBookModal Component', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Round1StoryBookModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders book cover initially with Round 1 title', () => {
    render(<Round1StoryBookModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/The Last Night at Hollow House/i)).toBeInTheDocument();
    expect(screen.getByText(/OPEN CHRONICLE/i)).toBeInTheDocument();
    expect(screen.getByText(/1994 Vance Family Vanishing/i)).toBeInTheDocument();
  });

  it('opens to Chapter I (The Vanishing) when clicking Open Chronicle', () => {
    render(<Round1StoryBookModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/OPEN CHRONICLE/i));

    expect(screen.getByText(/Chapter I/i)).toBeInTheDocument();
    expect(screen.getByText(/The Night the Walls Dissolved/i)).toBeInTheDocument();
    expect(screen.getByText(/TEN FRAGMENTS\. TEN SEALS\. ONE DOOR/i)).toBeInTheDocument();
  });

  it('navigates through all chapters using Next and Previous buttons', () => {
    render(<Round1StoryBookModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/OPEN CHRONICLE/i));

    // Chapter 1 -> Chapter 2 (Lena Vance & Bedroom)
    fireEvent.click(screen.getByText(/Next Page/i));
    expect(screen.getByText(/Chapter II/i)).toBeInTheDocument();
    expect(screen.getByText(/Lena Vance: The Girl Who Heard the Call/i)).toBeInTheDocument();
    expect(screen.getByText(/The 15 Bedroom Fragments/i)).toBeInTheDocument();

    // Chapter 2 -> Chapter 3 (Daniel Vance & Study)
    fireEvent.click(screen.getByText(/Next Page/i));
    expect(screen.getByText(/Chapter III/i)).toBeInTheDocument();
    expect(screen.getByText(/Daniel Vance: Tracking the Resonance/i)).toBeInTheDocument();
    expect(screen.getByText(/corrupted memory faults/i)).toBeInTheDocument();
    expect(screen.queryByText(/ORBIT/i)).toBeNull();
    expect(screen.getByText(/The 16 Study Fragments & Decoys/i)).toBeInTheDocument();

    // Chapter 3 -> Chapter 4 (The Basement)
    fireEvent.click(screen.getByText(/Next Page/i));
    expect(screen.getByText(/Chapter IV/i)).toBeInTheDocument();
    expect(screen.getByText(/The Subterranean Containment Core/i)).toBeInTheDocument();

    // Chapter 4 -> Chapter 5 (The Reconstructed Truth & Photograph)
    fireEvent.click(screen.getByText(/Next Page/i));
    expect(screen.getByText(/Chapter V/i)).toBeInTheDocument();
    expect(screen.getByText(/Five People\. Four Shadows\./i)).toBeInTheDocument();
    expect(screen.getByText(/Master Keywords/i)).toBeInTheDocument();
    expect(screen.queryByText(/LANTERN/i)).toBeNull();
    expect(screen.queryByText(/SRC-TEST9/i)).toBeNull();

    // Previous back to Chapter 4
    fireEvent.click(screen.getByText(/Previous/i));
    expect(screen.getByText(/Chapter IV/i)).toBeInTheDocument();
  });

  it('allows quick jumping via chapter pills', () => {
    render(<Round1StoryBookModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/OPEN CHRONICLE/i));

    // Jump directly to chapter V
    fireEvent.click(screen.getByTitle(/Jump to Page 5/i));
    expect(screen.getByText(/Chapter V/i)).toBeInTheDocument();

    // Jump back to Cover
    fireEvent.click(screen.getByTitle(/Jump to Page 0/i));
    expect(screen.getByText(/OPEN CHRONICLE/i)).toBeInTheDocument();
  });

  it('closes when clicking the close button or pressing Escape / S', () => {
    const handleClose = vi.fn();
    render(<Round1StoryBookModal isOpen={true} onClose={handleClose} />);

    fireEvent.click(screen.getByText(/Close \(S\)/i));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: 's' });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  it('supports ArrowRight and ArrowLeft key navigation', () => {
    render(<Round1StoryBookModal isOpen={true} onClose={vi.fn()} />);

    // ArrowRight from cover opens Chapter 1
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/Chapter I/i)).toBeInTheDocument();

    // ArrowRight opens Chapter 2
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/Chapter II/i)).toBeInTheDocument();

    // ArrowLeft goes back to Chapter 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/Chapter I/i)).toBeInTheDocument();
  });
});
