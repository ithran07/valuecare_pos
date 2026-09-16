import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

type ManagementSelectProps = {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    ariaLabel?: string;
};

export default function ManagementSelect({
    value,
    options,
    onChange,
    placeholder = "Select an option",
    ariaLabel,
}: ManagementSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = options.find((option) => option.value === value);
    const label = selected?.label || placeholder;
    const accessibleLabel = ariaLabel || placeholder;

    useEffect(() => {
        function closeOnOutsideClick(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    return (
        <div className="management-select" ref={ref}>
            <button
                type="button"
                className="management-select-trigger"
                aria-label={accessibleLabel}
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                <span>{label}</span>
                <ChevronDown
                    size={16}
                    className={open ? "management-select-chevron-open" : ""}
                />
            </button>
            {open && (
                <div
                    className="management-select-menu"
                    role="listbox"
                    aria-label={accessibleLabel}
                >
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`management-select-option ${
                                    isSelected ? "selected" : ""
                                }`}
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                            >
                                <span>{option.label}</span>
                                {isSelected && <Check size={15} />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
