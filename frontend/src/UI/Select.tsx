import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string | number;
    label: string;
}

interface SelectProps {
    options: SelectOption[];
    value: string | number;
    onChange: (value: any) => void;
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
}

export function Select({ options, value, onChange, placeholder = "Select...", className = '', icon }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-[#0f1923] border ${isOpen ? 'border-[#ff4655]' : 'border-gray-600'} rounded-lg py-3 px-4 text-white text-left flex items-center justify-between focus:outline-none focus:border-[#ff4655] transition-all`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && <span className="text-gray-500">{icon}</span>}
                    <span className={selectedOption ? 'text-white' : 'text-gray-500'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#ff4655]' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#1f2937] border border-gray-600 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${
                                    value === option.value
                                        ? 'bg-[#ff4655]/10 text-[#ff4655] font-bold border-l-2 border-[#ff4655]'
                                        : 'text-gray-300 hover:bg-[#0f1923] hover:text-white border-l-2 border-transparent'
                                }`}
                            >
                                {option.label}
                                {value === option.value && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}