import React from 'react';

interface DataGridProps {
    data: any[][];
    onCellClick: (col: number, row: number, val: any) => void;
    onCellDoubleClick: (col: number, row: number, val: any) => void;
    selectedCell?: { col: number, row: number } | null;
    changedCells?: Set<string>;
}

export const DataGrid: React.FC<DataGridProps> = ({
    data,
    onCellClick,
    onCellDoubleClick,
    selectedCell,
    changedCells
}) => {
    if (!data || data.length === 0) return <div className="p-4 text-gray-400">No Data</div>;

    const headers = data[0];
    const rows = data.slice(1);

    return (
        <div className="overflow-auto flex-1 relative">
            <table className="min-w-full divide-y divide-gray-200 border-separate" style={{ borderSpacing: 0 }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 sticky top-0 max-w-[150px] overflow-hidden text-ellipsis">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((row, rIndex) => (
                        <tr key={rIndex} className="hover:bg-blue-50 transition-colors">
                            {row.map((cell, cIndex) => {
                                // determine if this is a "header" column (col 0 usually)
                                const isRowHeader = cIndex === 0;
                                const isSelected = selectedCell?.col === cIndex && selectedCell?.row === rIndex + 1;
                                const isChanged = changedCells?.has(`${cIndex},${rIndex + 1}`);

                                return (
                                    <td
                                        key={cIndex}
                                        className={`px-3 py-2 whitespace-nowrap text-sm border-r border-gray-100 last:border-r-0 cursor-pointer max-w-[150px] overflow-hidden text-ellipsis transition-all duration-1000
                                            ${isRowHeader ? 'font-medium text-gray-900 bg-gray-50 max-w-[250px]' : 'text-gray-500'}
                                            ${isSelected ? 'ring-2 ring-blue-600 z-20 relative bg-blue-50' : ''}
                                            ${!isSelected && isChanged ? 'bg-blue-300' : ''}
                                        `}
                                        onClick={() => onCellClick(cIndex, rIndex + 1, cell)}
                                        onDoubleClick={() => onCellDoubleClick(cIndex, rIndex + 1, cell)}
                                    >
                                        {typeof cell === 'number'
                                            ? cell.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                            : typeof cell === 'object' && cell !== null
                                                ? (cell.message || cell.value || 'Error')
                                                : cell}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
