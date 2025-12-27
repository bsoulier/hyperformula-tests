import React, { useState, useEffect, useRef } from 'react';

interface FormulaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (val: string) => void;
    initialValue: string;
    availableNames: string[];
}

export const FormulaModal: React.FC<FormulaModalProps> = ({ isOpen, onClose, onSave, initialValue, availableNames }) => {
    const [value, setValue] = useState(String(initialValue));
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [cursorPos, setCursorPos] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setValue(String(initialValue));
    }, [initialValue]);

    useEffect(() => {
        // Simple Autocomplete Logic
        const textUpToCursor = value.slice(0, cursorPos);
        // Include dots in match
        const match = textUpToCursor.match(/([a-zA-Z_0-9\.]+)$/); // Match last word
        if (match) {
            const word = match[1];
            if (word.length > 0) {
                // Case insensitive matching
                const lowerWord = word.toLowerCase();
                const filtered = availableNames.filter(n =>
                    n.toLowerCase().startsWith(lowerWord) && n !== word
                );
                setSuggestions(filtered);
                return;
            }
        }
        setSuggestions([]);
    }, [value, cursorPos, availableNames]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        // If suggestions open, maybe navigate? For now simple click.
    };

    const insertSuggestion = (suggestion: string) => {
        const textUpToCursor = value.slice(0, cursorPos);
        const textAfterCursor = value.slice(cursorPos);
        const match = textUpToCursor.match(/([a-zA-Z_0-9\.]+)$/);

        if (match) {
            const wordStart = match.index!;
            const newValue = value.slice(0, wordStart) + suggestion + textAfterCursor;
            setValue(newValue);
            setSuggestions([]);
            // Restore focus?
            textareaRef.current?.focus();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Edit Formula</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>

                <div className="p-4 flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setCursorPos(e.target.selectionStart);
                        }}
                        onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-32 p-3 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />

                    {/* Autocomplete Dropdown */}
                    {suggestions.length > 0 && (
                        <div className="absolute left-4 z-10 w-64 bg-white border border-gray-200 shadow-lg rounded-md max-h-48 overflow-y-auto mt-1">
                            {suggestions.map(s => (
                                <button
                                    key={s}
                                    onClick={() => insertSuggestion(s)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 font-mono text-gray-700"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                    <button
                        onClick={() => onSave(value)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
