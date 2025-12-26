import React, { useState } from 'react';

interface DataGridProps {
    data: any[][];
    onCellClick: (col: number, row: number, val: any) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({ data, onCellClick }) => {
    if (!data || data.length === 0) return <div>No Data</div>;

    return (
        <div className="overflow-auto border border-gray-200 rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, rIndex) => (
                        <tr key={rIndex} className={rIndex === 0 ? "bg-gray-50 font-bold" : ""}>
                            {/* Index Column */}
                            <td className="px-3 py-2 text-xs text-gray-400 border-r select-none">{rIndex + 1}</td>

                            {row.map((cell, cIndex) => (
                                <td
                                    key={cIndex}
                                    onClick={() => onCellClick(cIndex, rIndex, cell)}
                                    className={`px-4 py-2 text-sm text-gray-900 whitespace-nowrap cursor-pointer hover:bg-blue-50 border-r border-transparent hover:border-blue-200 transition-colors ${cIndex === 0 ? "font-medium bg-gray-50 sticky left-0 shadow-sm" : "text-right"}`}
                                >
                                    {typeof cell === 'number'
                                        ? cell.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                        : typeof cell === 'object' && cell !== null
                                            ? (cell.message || cell.value || 'Error')
                                            : cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
