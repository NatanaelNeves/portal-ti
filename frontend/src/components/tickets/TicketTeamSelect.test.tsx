import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TicketTeamSelect from './TicketTeamSelect';

afterEach(cleanup);

function Fixture({ onChange = () => {} }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('ti');
  return <><TicketTeamSelect value={value} onChange={next => { setValue(next); onChange(next); }} /><button>Próximo controle</button></>;
}

describe('seletor de equipe dos chamados', () => {
  it('mostra a seleção atual e aplica uma equipe com o mouse', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Fixture onChange={onChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Equipe responsável Tecnologia da Informação' });
    await user.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'Tecnologia da Informação' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: 'Recursos Humanos' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('rh');
    expect(trigger).toHaveAccessibleName('Equipe responsável Recursos Humanos');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Todas as equipes' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('permite explorar com as setas e cancelar sem trocar a equipe', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Fixture onChange={onChange} />);
    const trigger = screen.getByRole('combobox');
    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Recursos Humanos' }).id);
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAccessibleName('Equipe responsável Tecnologia da Informação');
    await user.keyboard('{Enter}{End}{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith('administrativo');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('busca pelo nome e confirma com espaço sem reabrir o menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Fixture onChange={onChange} />);
    await user.tab();
    await user.keyboard('rec');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Recursos Humanos' }).id);
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledExactlyOnceWith('rh');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('fecha com Tab ou clique externo e não reaplica a equipe já selecionada', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Fixture onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.tab();
    expect(screen.getByRole('button', { name: 'Próximo controle' })).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('button', { name: 'Próximo controle' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Tecnologia da Informação' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
