import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

const teams = [
  { value: '', label: 'Todas as equipes', icon: 'ti-layout-grid' },
  { value: 'ti', label: 'Tecnologia da Informação', icon: 'ti-device-desktop' },
  { value: 'rh', label: 'Recursos Humanos', icon: 'ti-users' },
  { value: 'administrativo', label: 'Administrativo', icon: 'ti-building' },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Select-only combobox: arrows explore; Enter/Space or a click applies the team. */
export default function TicketTeamSelect({ value, onChange }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, teams.findIndex(team => team.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = teams[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    const menu = options.current;
    const option = document.getElementById(`${id}-option-${activeIndex}`);
    if (!open || !menu || !option) return;
    // Keep keyboard navigation inside the popup without scrolling the page.
    if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) {
      menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight;
    }
  }, [open, activeIndex, id]);

  const showOptions = (index = selectedIndex) => {
    setActiveIndex(index);
    search.current = { text: '', time: 0 };
    setOpen(true);
  };

  const choose = (index: number) => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
    if (teams[index].value !== value) onChange(teams[index].value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key } = event;
    if (key === 'Tab') { setOpen(false); return; }
    if (key === 'Escape') {
      if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      return;
    }
    if (['Enter', ' '].includes(key)) {
      event.preventDefault();
      if (open) choose(activeIndex); else showOptions();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      const next = key === 'Home' ? 0 : key === 'End' ? teams.length - 1
        : Math.max(0, Math.min(teams.length - 1, activeIndex + (key === 'ArrowDown' ? 1 : -1)));
      if (open) setActiveIndex(next); else showOptions(key === 'Home' || key === 'End' ? next : selectedIndex);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const letter = normalize(key);
      const text = now - search.current.time < 600 ? search.current.text + letter : letter;
      search.current = { text, time: now };
      const query = [...text].every(character => character === letter) ? letter : text;
      const start = open ? activeIndex : selectedIndex;
      const match = teams.map((_, offset) => (start + offset + 1) % teams.length)
        .find(index => normalize(teams[index].label).startsWith(query));
      if (match !== undefined) { setActiveIndex(match); setOpen(true); }
    }
  };

  return (
    <div className="tk-team-picker" ref={root} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button
        type="button"
        ref={trigger}
        className="tk-team-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => { if (open) setOpen(false); else showOptions(); }}
        onKeyDown={handleKeyDown}
      >
        <span className="tk-team-symbol" aria-hidden="true"><i className={`ti ${selected.icon}`} /></span>
        <span className="tk-team-copy"><span className="tk-team-label" id={`${id}-label`}>Equipe responsável</span><span className="tk-team-value" id={`${id}-value`}>{selected.label}</span></span>
        <i className="ti ti-chevron-down tk-team-chevron" aria-hidden="true" />
      </button>
      {open && <div ref={options} className="tk-team-options" id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`}>
        {teams.map((team, index) => <div
          key={team.value}
          id={`${id}-option-${index}`}
          role="option"
          aria-selected={team.value === value}
          className={`tk-team-option ${activeIndex === index ? 'is-active' : ''}`}
          onPointerMove={() => setActiveIndex(index)}
          onMouseDown={event => event.preventDefault()}
          onClick={() => choose(index)}
        >
          <i className={`ti ${team.icon} tk-team-option-icon`} aria-hidden="true" />
          <span>{team.label}</span>
          {team.value === value && <i className="ti ti-check tk-team-check" aria-hidden="true" />}
        </div>)}
      </div>}
    </div>
  );
}
