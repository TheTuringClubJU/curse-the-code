import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Round2DossierModal from '../game/components/Round2DossierModal';

describe('Round2DossierModal Component', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Round2DossierModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders storyline prologue and room reasons exclusively in Lobby mode (isLobby=true)', () => {
    render(<Round2DossierModal isOpen={true} isLobby={true} onClose={vi.fn()} />);

    // Prologue heading and lore connecting Round 1 and Round 2
    expect(screen.getByText(/Prologue: The Subterranean Breach/i)).toBeInTheDocument();
    expect(screen.getByText(/Bridging Round 1 & Round 2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sub-Station Delta/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Project HOLLOW/i)).toBeInTheDocument();

    // Reasons why the three sectors exist
    expect(screen.getByText(/Why the Three Subterranean Sectors Exist/i)).toBeInTheDocument();
    expect(screen.getByText(/The flooded records depository where classified project logs/i)).toBeInTheDocument();
    expect(screen.getByText(/The fortified observation bunker equipped with CCTV feeds/i)).toBeInTheDocument();
    expect(screen.getByText(/The deepest monolithic sanctum housing the high-voltage failsafe matrix/i)).toBeInTheDocument();
  });

  it('omits storyline prologue in In-Room mode (isLobby=false)', () => {
    render(<Round2DossierModal isOpen={true} isLobby={false} onClose={vi.fn()} />);

    // Prologue should NOT be in the document
    expect(screen.queryByText(/Prologue: The Subterranean Breach/i)).toBeNull();
    expect(screen.queryByText(/Why the Three Subterranean Sectors Exist/i)).toBeNull();

    // But tactical chamber directives and fragment counts must still be present
    expect(screen.getByText(/1\. Sector 02 Chambers & Fragment Distributions/i)).toBeInTheDocument();
  });

  it('displays accurate fragment quotas for each chamber', () => {
    render(<Round2DossierModal isOpen={true} isLobby={false} onClose={vi.fn()} />);

    // Chamber IV: 12 Fragments (10 Evidence + 2 Decoys)
    expect(screen.getByText(/\b12 Fragments\b/i)).toBeInTheDocument();
    expect(screen.getByText(/\(10 Evidence \+ 2 Decoys\)/i)).toBeInTheDocument();

    // Chamber V: 10 Fragments (8 Evidence + 2 Decoys)
    expect(screen.getByText(/\b10 Fragments\b/i)).toBeInTheDocument();
    expect(screen.getByText(/\(8 Evidence \+ 2 Decoys\)/i)).toBeInTheDocument();

    // Chamber VI: 0 Fragments
    expect(screen.getByText(/\b0 Fragments\b/i)).toBeInTheDocument();
    expect(screen.getByText(/\(Direct Puzzle Chamber\)/i)).toBeInTheDocument();
  });

  it('states all key directives without naming clue numbers', () => {
    render(<Round2DossierModal isOpen={true} isLobby={false} onClose={vi.fn()} />);

    // Cross-chamber answers feed forward
    expect(screen.getByText(/Cross-Chamber Continuity \(Answers Feed Forward\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Do not discard solved clues!/i)).toBeInTheDocument();

    // Multiple clues in single objects
    expect(screen.getByText(/Multiple Clues Concealed Within Single Objects/i)).toBeInTheDocument();
    expect(screen.getByText(/multiple distinct clues/i)).toBeInTheDocument();

    // Strict sequential progression
    expect(screen.getByText(/Strict Sequential Clue & Fragment Progression/i)).toBeInTheDocument();
    expect(screen.getByText(/Sequential Fragment Hunting/i)).toBeInTheDocument();
    expect(screen.getByText(/Sequential Clue Gating/i)).toBeInTheDocument();

    // Branching fork corridors and penalty
    expect(screen.getByText(/Branching Fork Corridors \(Do Not Gamble\)/i)).toBeInTheDocument();
    expect(screen.getByText(/60-second time penalty/i)).toBeInTheDocument();

    // Independent 15-hint budget
    expect(screen.getByText(/ROUND 2 BUDGET: 15 FRESH HINTS/i)).toBeInTheDocument();
    expect(screen.getByText(/INDEPENDENT FROM ROUND 1/i)).toBeInTheDocument();
  });

  it('triggers onClose when pressing ESC, R, or clicking the close button', () => {
    const handleClose = vi.fn();
    render(<Round2DossierModal isOpen={true} isLobby={false} onClose={handleClose} />);

    // Click Close button
    fireEvent.click(screen.getByText(/CLOSE \[R\]/i));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Press R key
    fireEvent.keyDown(window, { key: 'r', code: 'KeyR' });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  it('triggers onClose when pressing S in Lobby mode', () => {
    const handleClose = vi.fn();
    render(<Round2DossierModal isOpen={true} isLobby={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 's', code: 'KeyS' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
