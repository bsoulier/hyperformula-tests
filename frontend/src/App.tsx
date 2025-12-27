import React, { useState, useEffect } from 'react';
import { DataGrid } from './DataGrid';
import { FormulaModal } from './FormulaModal';

function App() {
  const [data, setData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ col: number, row: number, val: any } | null>(null);
  const [formula, setFormula] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'cash' | 'bs'>('products');
  const [editingCell, setEditingCell] = useState<{ col: number, row: number, val: string } | null>(null);
  const [availableNames, setAvailableNames] = useState<string[]>([]);
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set());

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    if (changedCells.size > 0) {
      const timer = setTimeout(() => {
        setChangedCells(new Set());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [changedCells]);

  const detectChanges = (newData: any[][]) => {
    if (data.length === 0) return; // Don't highlight on first load
    const changes = new Set<string>();

    // We assume dimensions don't change drastically for this simple diff
    newData.forEach((row, rIndex) => {
      row.forEach((cell, cIndex) => {
        const oldVal = data[rIndex]?.[cIndex];
        // Simple equality check. 
        // Note: Objects/Errors might need custom check, but strict equality covers most primitives
        // For objects (message/value), we might need deeper check
        let isDiff = oldVal !== cell;
        if (typeof cell === 'object' && cell !== null && typeof oldVal === 'object' && oldVal !== null) {
          isDiff = cell.value !== oldVal.value || cell.message !== oldVal.message;
        }

        if (isDiff) {
          changes.add(`${cIndex},${rIndex + 1}`); // Store 1-based row for consistency with grid logic
        }
      });
    });

    if (changes.size > 0) {
      setChangedCells(changes);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/model`);
      const json = await res.json();
      // On re-fetch, maybe we want to diff? 
      // If user just refreshed, we skip. But if triggered by something else?
      // For now, fetchData is only called on mount, so it hits the data.length===0 check and skips.
      setData(json);

      const namesRes = await fetch(`${API_URL}/model/names`);
      const namesJson = await namesRes.json();
      setAvailableNames(namesJson);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCellClick = async (col: number, row: number, val: any) => {
    setSelectedCell({ col, row, val });
    try {
      const res = await fetch(`${API_URL}/formula?col=${col}&row=${row}`);
      const json = await res.json();
      setFormula(json.formula || val);
    } catch (e) {
      setFormula(val);
    }
  };

  const handleCellDoubleClick = async (col: number, row: number, val: any) => {
    try {
      const res = await fetch(`${API_URL}/formula?col=${col}&row=${row}`);
      const json = await res.json();
      setEditingCell({ col, row, val: json.formula || val });
    } catch (e) {
      setEditingCell({ col, row, val });
    }
  };

  const handleFormulaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    submitEdit(selectedCell.col, selectedCell.row, formula);
  };

  const submitEdit = async (col: number, row: number, val: string) => {
    try {
      const res = await fetch(`${API_URL}/model/cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ col, row, input: val })
      });
      const json = await res.json();

      detectChanges(json);
      setData(json);

      setEditingCell(null);
      setFormula('');
    } catch (e) {
      console.error(e);
    }
  };

  const getFilteredData = () => {
    if (data.length === 0) return [];
    if (activeTab === 'all') return data;

    let startRow = 0;
    let endRow = data.length;

    const findRow = (text: string) => data.findIndex(row => row[0] === text);

    const incomeHeader = findRow('--- INCOME STATEMENT ---');
    const bsHeader = findRow('--- BALANCE SHEET ---');

    if (activeTab === 'products') {
      endRow = incomeHeader > -1 ? incomeHeader : data.length;
    } else if (activeTab === 'cash') {
      startRow = bsHeader > -1 ? bsHeader : 0;
    } else if (activeTab === 'bs') {
      startRow = bsHeader > -1 ? bsHeader : 0;
    }

    const sliced = data.slice(startRow, endRow);
    const header = data[0];
    if (startRow > 0) return [header, ...sliced];
    return sliced;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">HF</div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Financial Model</h1>
        </div>

        {/* Formula Bar */}
        <form onSubmit={handleFormulaSubmit} className="flex-1 max-w-2xl mx-8 flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 font-mono">fx</span>
            </div>
            <input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Select a cell to edit formula..."
              className="w-full pl-8 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono text-sm"
              disabled={!selectedCell}
            />
          </div>
          <button
            type="submit"
            disabled={!selectedCell}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Apply
          </button>
        </form>

        <div className="text-sm text-gray-500">
          {selectedCell ? `Cell [${selectedCell.col}, ${selectedCell.row}]` : 'Ready'}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 pt-2">
        <nav className="flex space-x-6">
          {(['all', 'products', 'cash', 'bs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab === 'all' ? 'Master View' : tab === 'products' ? 'Products & Revenue' : tab === 'cash' ? 'Cash Flow' : 'Balance Sheet'}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 animate-pulse">Loading Model...</div>
        ) : (
          <>
            <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <DataGrid
                data={getFilteredData()}
                onCellClick={handleCellClick}
                onCellDoubleClick={handleCellDoubleClick}
                selectedCell={selectedCell}
                changedCells={changedCells}
              />
            </div>

            {editingCell && (
              <FormulaModal
                isOpen={true}
                onClose={() => setEditingCell(null)}
                onSave={(val) => submitEdit(editingCell.col, editingCell.row, val)}
                initialValue={editingCell.val}
                availableNames={availableNames}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
