import { useId, useState } from 'react';

export default function Collapsible({
                                        title,
                                        defaultOpen = true,
                                        actions = null,
                                        className = '',
                                        onToggle,
                                        children,
                                    }) {
    const [open, setOpen] = useState(defaultOpen);
    const panelId = useId();

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (onToggle) onToggle(next);
    };

    return (
        <section className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
            <div className="flex items-center justify-between px-4 py-3">
                <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="inline-flex items-center gap-3 text-left"
                >
                    <span className="text-base font-semibold text-slate-800">{title}</span>
                    <span className="text-slate-600 transition-transform duration-200">
            {open ? '▾' : '▸'}
          </span>
                </button>
                {actions}
            </div>

            <div id={panelId} hidden={!open} className="px-4 pb-4">
                {children}
            </div>
        </section>
    );
}
