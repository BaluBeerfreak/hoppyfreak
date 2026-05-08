import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingCart, X, Plus, Minus, Calendar, Package, Truck, Sparkles, Flame, AlertTriangle, Check, Filter, ArrowUpDown, Send, ChevronDown, ChevronLeft, Info, Loader2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const API_URL = 'https://script.google.com/macros/s/AKfycbzCpjJpf75xpneYT1v056gXxgBVQRXYTTqi6QOmmmXTdNTA5BwrPmlnyHk8mSDg/exec';

const AROMA_KEYS = ['Citrus', 'Tropical Fruit', 'Stone Fruit', 'Berry', 'Floral', 'Grassy', 'Herbal', 'Spice', 'Resin / Pine'];
const TYPES = ['Всі', 'T90', 'Кріо', 'Масло', 'Інше'];

function parseHops(rawHops) {
  return rawHops.map(h => ({
    ...h,
    id: Number(h.id),
    alpha: Number(h.alpha) || 0,
    crop: Number(h.crop) || 2024,
    stock: Number(h.stock) || 0,
    packaging: typeof h.packaging === 'string' ? h.packaging.split(',').map(s => s.trim()) : [],
    isNew: h.isNew === true || h.isNew === 'TRUE' || h.isNew === 'true',
    superPrice: h.superPrice === true || h.superPrice === 'TRUE' || h.superPrice === 'true',
    eta: h.eta ? (typeof h.eta === 'string' ? h.eta.slice(0, 10) : new Date(h.eta).toISOString().slice(0, 10)) : null,
    notes: h.notes || '',
    aroma: [
      h.aroma_citrus, h.aroma_tropical, h.aroma_stone,
      h.aroma_berry, h.aroma_floral, h.aroma_grassy,
      h.aroma_herbal, h.aroma_spice, h.aroma_resin
    ].map(v => Number(v) || 0)
  }));
}

function parseShipments(rawShipments, rawItems) {
  return rawShipments.map(s => ({
    ...s,
    id: Number(s.id),
    delay: Number(s.delay) || 0,
    eta: s.eta ? (typeof s.eta === 'string' ? s.eta.slice(0, 10) : new Date(s.eta).toISOString().slice(0, 10)) : null,
    items: rawItems
      .filter(it => Number(it.shipment_id) === Number(s.id))
      .map(it => ({ hopId: Number(it.hop_id), qty: Number(it.qty) }))
  }));
}

function buildSuppliers(rawSuppliers) {
  return rawSuppliers.reduce((acc, s) => {
    if (s.key) acc[s.key] = { name: s.name || s.key, flag: s.flag || '' };
    return acc;
  }, {});
}

function getStockStatus(stock) {
  if (stock === 0) return 'out';
  if (stock <= 15) return 'low';
  return 'ok';
}

function StockBadge({ stock }) {
  const status = getStockStatus(stock);
  if (status === 'out') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">SOLD OUT</span>;
  if (status === 'low') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">МАЛО</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-lime-500/15 text-lime-400 border border-lime-500/30">В НАЯВНОСТІ</span>;
}

function AromaRadar({ data, size = 160 }) {
  const chartData = AROMA_KEYS.map((key, i) => ({ axis: key, value: data[i] || 0 }));
  return (
    <div style={{ width: '100%', height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
          <PolarGrid stroke="#2a3a2a" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#d1d5db', fontSize: 10 }} />
          <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} stroke="#2a3a2a" />
          <Radar dataKey="value" stroke="#84cc16" fill="#84cc16" fillOpacity={0.4} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HopCard({ hop, suppliers, onAdd, onOpen }) {
  const supplier = suppliers[hop.supplier] || { name: hop.supplier || '?', flag: '' };
  const isOut = hop.stock === 0;
  return (
    <div onClick={onOpen} className="bg-[#161c17] border border-[#2a3a2a] rounded-xl p-4 hover:border-lime-500/40 transition-all flex flex-col cursor-pointer">
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-white truncate">{hop.name}</h3>
            {hop.isNew && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-lime-500 text-black flex items-center gap-1"><Sparkles size={10} /> НОВИНКА</span>}
            {hop.superPrice && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-black flex items-center gap-1"><Flame size={10} /> СУПЕР ЦІНА</span>}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{hop.country} {hop.farm} · Crop {hop.crop}</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#0d120e] border border-[#2a3a2a]" title={supplier.name}>
          <span className="text-xs">{supplier.flag}</span>
          <span className="text-[10px] font-medium text-gray-400">{supplier.name}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 my-3">
        <div className="bg-[#0d120e] rounded-lg p-2 border border-[#2a3a2a]">
          <div className="text-[10px] text-gray-500 uppercase">Alpha</div>
          <div className="text-sm font-bold text-white">{hop.alpha > 0 ? `${hop.alpha}%` : '—'}</div>
        </div>
        <div className="bg-[#0d120e] rounded-lg p-2 border border-[#2a3a2a]">
          <div className="text-[10px] text-gray-500 uppercase">Тип</div>
          <div className="text-sm font-bold text-white">{hop.type}</div>
        </div>
        <div className="bg-[#0d120e] rounded-lg p-2 border border-[#2a3a2a]">
          <div className="text-[10px] text-gray-500 uppercase">Упак.</div>
          <div className="text-sm font-bold text-white">{hop.packaging.join('/')}</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{hop.notes}</p>
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#2a3a2a] gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <StockBadge stock={hop.stock} />
          {isOut && hop.eta && (
            <span className="text-[10px] text-lime-400 flex items-center gap-1">
              <Truck size={10} /> ETA: {new Date(hop.eta).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onAdd(hop); }} className="px-3 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-black text-sm font-bold transition-colors flex items-center gap-1 whitespace-nowrap">
          <Plus size={14} />
          {isOut ? 'Преордер' : 'В кошик'}
        </button>
      </div>
    </div>
  );
}

function HopDetail({ hop, suppliers, onClose, onAdd }) {
  if (!hop) return null;
  const supplier = suppliers[hop.supplier] || { name: hop.supplier || '?', flag: '' };
  const isOut = hop.stock === 0;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div onClick={(e) => e.stopPropagation()} className="absolute inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-xl md:w-full md:max-h-[90vh] md:rounded-2xl bg-[#0d120e] border border-[#2a3a2a] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#2a3a2a] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onClose} className="md:hidden w-8 h-8 rounded-lg bg-[#161c17] border border-[#2a3a2a] flex items-center justify-center text-gray-400">
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{hop.name}</h2>
              <p className="text-xs text-gray-400 truncate">{hop.country} {hop.farm}</p>
            </div>
          </div>
          <button onClick={onClose} className="hidden md:flex w-8 h-8 rounded-lg hover:bg-[#161c17] items-center justify-center text-gray-400">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <StockBadge stock={hop.stock} />
            {hop.isNew && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-lime-500 text-black flex items-center gap-1"><Sparkles size={10} /> НОВИНКА</span>}
            {hop.superPrice && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-black flex items-center gap-1"><Flame size={10} /> СУПЕР ЦІНА</span>}
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#161c17] text-gray-300 border border-[#2a3a2a]">{supplier.flag} {supplier.name}</span>
          </div>
          <div className="bg-[#161c17] border border-[#2a3a2a] rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Info size={12} /> Профіль аромату
            </div>
            <AromaRadar data={hop.aroma} size={220} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#161c17] rounded-lg p-3 border border-[#2a3a2a]">
              <div className="text-[10px] text-gray-500 uppercase">Alpha</div>
              <div className="text-lg font-bold text-white">{hop.alpha > 0 ? `${hop.alpha}%` : '—'}</div>
            </div>
            <div className="bg-[#161c17] rounded-lg p-3 border border-[#2a3a2a]">
              <div className="text-[10px] text-gray-500 uppercase">Crop</div>
              <div className="text-lg font-bold text-white">{hop.crop}</div>
            </div>
            <div className="bg-[#161c17] rounded-lg p-3 border border-[#2a3a2a]">
              <div className="text-[10px] text-gray-500 uppercase">Тип</div>
              <div className="text-lg font-bold text-white">{hop.type}</div>
            </div>
            <div className="bg-[#161c17] rounded-lg p-3 border border-[#2a3a2a]">
              <div className="text-[10px] text-gray-500 uppercase">Упаковка</div>
              <div className="text-lg font-bold text-white">{hop.packaging.join(' / ')}</div>
            </div>
          </div>
          {hop.notes && (
            <div className="bg-[#161c17] rounded-xl p-4 border border-[#2a3a2a]">
              <div className="text-xs text-gray-500 uppercase mb-2">Опис</div>
              <p className="text-sm text-gray-300">{hop.notes}</p>
            </div>
          )}
          {isOut && hop.eta && (
            <div className="bg-lime-500/10 border border-lime-500/30 rounded-xl p-3 flex items-center gap-2">
              <Truck size={16} className="text-lime-400" />
              <div className="text-sm">
                <span className="text-gray-300">Очікується: </span>
                <span className="text-lime-400 font-bold">{new Date(hop.eta).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-[#2a3a2a]">
          <button onClick={() => { onAdd(hop); onClose(); }} className="w-full py-3 rounded-lg bg-lime-500 hover:bg-lime-400 text-black font-bold transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> {isOut ? 'Зарезервувати з преордеру' : 'Додати в кошик'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShipmentCard({ shipment, hops, suppliers }) {
  const supplier = suppliers[shipment.supplier] || { name: shipment.supplier || '?', flag: '' };
  const date = new Date(shipment.eta);
  const day = date.getDate();
  const month = date.toLocaleDateString('uk-UA', { month: 'long' });
  const weekday = date.toLocaleDateString('uk-UA', { weekday: 'long' });
  const totalKg = shipment.items.reduce((acc, i) => acc + i.qty, 0);
  return (
    <div className="bg-[#161c17] border border-[#2a3a2a] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#2a3a2a] flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-[#0d120e] border border-[#2a3a2a] flex flex-col items-center justify-center">
            <div className="text-lg font-black text-lime-400 leading-none">{day}</div>
            <div className="text-[10px] text-gray-400 uppercase mt-0.5">{month.slice(0, 3)}</div>
          </div>
          <div>
            <div className="font-bold text-white text-lg flex items-center gap-2">
              {supplier.flag} {supplier.name}
            </div>
            <div className="text-xs text-gray-400 capitalize">{weekday} · {shipment.items.length} позицій · {totalKg} кг</div>
          </div>
        </div>
        {shipment.delay > 0 ? (
          <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
            <AlertTriangle size={12} /> Затримка {shipment.delay} дн.
          </span>
        ) : shipment.status === 'in_transit' ? (
          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Truck size={12} /> В дорозі
          </span>
        ) : (
          <span className="px-2 py-1 rounded text-xs font-bold bg-gray-500/15 text-gray-400 border border-gray-500/30 flex items-center gap-1">
            <Package size={12} /> Замовлено
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        {shipment.items.map((it, idx) => {
          const hop = hops.find(h => h.id === it.hopId);
          if (!hop) return null;
          const hopSupplier = suppliers[hop.supplier] || { flag: '' };
          return (
            <div key={idx} className="flex items-center justify-between text-sm bg-[#0d120e] rounded-lg p-2 border border-[#2a3a2a]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs">{hopSupplier.flag}</span>
                <span className="text-white truncate font-medium">{hop.name}</span>
                <span className="text-gray-500 text-xs whitespace-nowrap">{hop.type}</span>
              </div>
              <span className="text-lime-400 font-bold whitespace-nowrap">{it.qty} кг</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cart({ open, onClose, items, suppliers, onUpdate, onRemove, onSubmit, submitting }) {
  const [pkgChoice, setPkgChoice] = useState({});
  const [step, setStep] = useState('list');
  const [form, setForm] = useState({ brewery: '', contact: '', city: '', notes: '' });

  if (!open) return null;
  const total = items.reduce((acc, i) => acc + i.qty, 0);
  const canSubmit = items.length > 0 && form.brewery.trim() && form.contact.trim() && !submitting;

  const handleClose = () => { onClose(); setStep('list'); };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-full md:w-[440px] bg-[#0d120e] border-l border-[#2a3a2a] flex flex-col">
        <div className="p-4 border-b border-[#2a3a2a] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {step === 'checkout' && (
              <button onClick={() => setStep('list')} className="w-8 h-8 rounded-lg bg-[#161c17] border border-[#2a3a2a] flex items-center justify-center text-gray-400 shrink-0">
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">{step === 'list' ? 'Кошик' : 'Контактні дані'}</h2>
              <p className="text-xs text-gray-400">{items.length} позицій · {total} кг</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-[#161c17] flex items-center justify-center text-gray-400 shrink-0">
            <X size={20} />
          </button>
        </div>
        {step === 'list' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Кошик порожній</p>
                </div>
              ) : items.map(item => {
                const hop = item.hop;
                const sup = suppliers[hop.supplier] || { flag: '' };
                const pkg = pkgChoice[hop.id] || hop.packaging[0];
                const stepKg = parseInt(pkg);
                return (
                  <div key={hop.id} className="bg-[#161c17] border border-[#2a3a2a] rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                          <span>{sup.flag} {hop.name}</span>
                          {hop.stock === 0 && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">PRE</span>}
                        </div>
                        <div className="text-xs text-gray-400">{hop.type} · α {hop.alpha}%</div>
                      </div>
                      <button onClick={() => onRemove(hop.id)} className="text-gray-500 hover:text-red-400 shrink-0"><X size={16} /></button>
                    </div>
                    {hop.packaging.length > 1 && (
                      <div className="flex gap-1 mb-2">
                        {hop.packaging.map(p => (
                          <button key={p} onClick={() => {
                            setPkgChoice({ ...pkgChoice, [hop.id]: p });
                            const newStep = parseInt(p);
                            const rounded = Math.max(newStep, Math.round(item.qty / newStep) * newStep);
                            onUpdate(hop.id, rounded);
                          }} className={`px-2 py-1 rounded text-xs font-medium ${pkg === p ? 'bg-lime-500 text-black' : 'bg-[#0d120e] text-gray-400 border border-[#2a3a2a]'}`}>{p}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onUpdate(hop.id, Math.max(stepKg, item.qty - stepKg))} className="w-8 h-8 rounded bg-[#0d120e] border border-[#2a3a2a] flex items-center justify-center text-gray-300 hover:border-lime-500/50"><Minus size={14} /></button>
                        <span className="text-white font-bold min-w-[64px] text-center">{item.qty} кг</span>
                        <button onClick={() => onUpdate(hop.id, item.qty + stepKg)} className="w-8 h-8 rounded bg-[#0d120e] border border-[#2a3a2a] flex items-center justify-center text-gray-300 hover:border-lime-500/50"><Plus size={14} /></button>
                      </div>
                      <span className="text-xs text-gray-500">крок {stepKg} кг</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {items.length > 0 && (
              <div className="p-4 border-t border-[#2a3a2a]">
                <button onClick={() => setStep('checkout')} className="w-full py-3 rounded-lg bg-lime-500 hover:bg-lime-400 text-black font-bold transition-colors flex items-center justify-center gap-2">
                  Оформити замовлення →
                </button>
              </div>
            )}
          </>
        )}
        {step === 'checkout' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-[#161c17] border border-[#2a3a2a] rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase mb-2">Зведення замовлення</div>
                {items.map(item => (
                  <div key={item.hop.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-white">{item.hop.name}</span>
                    <span className="text-lime-400 font-bold">{item.qty} кг</span>
                  </div>
                ))}
                <div className="border-t border-[#2a3a2a] mt-2 pt-2 flex items-center justify-between text-sm font-bold">
                  <span className="text-gray-400">Всього:</span>
                  <span className="text-lime-400">{total} кг</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Назва броварні *</label>
                <input placeholder="Наприклад: Varvar Brew" value={form.brewery} onChange={e => setForm({ ...form, brewery: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[#161c17] border border-[#2a3a2a] text-white text-sm focus:outline-none focus:border-lime-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Контакт *</label>
                <input placeholder="Телефон або @telegram" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[#161c17] border border-[#2a3a2a] text-white text-sm focus:outline-none focus:border-lime-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Місто</label>
                <input placeholder="Київ / Львів / ..." value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[#161c17] border border-[#2a3a2a] text-white text-sm focus:outline-none focus:border-lime-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Коментар</label>
                <textarea placeholder="Особливі умови, бажана дата і т.д." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-[#161c17] border border-[#2a3a2a] text-white text-sm focus:outline-none focus:border-lime-500/50 resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-[#2a3a2a]">
              <button disabled={!canSubmit} onClick={() => { onSubmit(form, () => { setForm({ brewery: '', contact: '', city: '', notes: '' }); setStep('list'); }); }} className="w-full py-3 rounded-lg bg-lime-500 hover:bg-lime-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold transition-colors flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Відправляю...</> : <><Send size={16} /> Надіслати в Telegram</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [hops, setHops] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [tab, setTab] = useState('hops');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('Всі');
  const [showOnlyAvail, setShowOnlyAvail] = useState(false);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [sort, setSort] = useState('new');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openHop, setOpenHop] = useState(null);

  useEffect(() => {
    fetch(API_URL)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setHops(parseHops(data.hops || []));
        setShipments(parseShipments(data.shipments || [], data.items || []));
        setSuppliers(buildSuppliers(data.suppliers || []));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Помилка завантаження даних');
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let list = hops.filter(h => {
      if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.farm.toLowerCase().includes(search.toLowerCase())) return false;
      if (type !== 'Всі' && h.type !== type) return false;
      if (showOnlyAvail && h.stock === 0) return false;
      if (showOnlyNew && !h.isNew) return false;
      return true;
    });
    if (sort === 'new') list.sort((a, b) => (b.isNew - a.isNew) || a.name.localeCompare(b.name));
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'alpha') list.sort((a, b) => b.alpha - a.alpha);
    return list;
  }, [hops, search, type, showOnlyAvail, showOnlyNew, sort]);

  const addToCart = (hop) => {
    const stepKg = parseInt(hop.packaging[0]) || 5;
    setCart(prev => {
      const exist = prev.find(i => i.hop.id === hop.id);
      if (exist) return prev.map(i => i.hop.id === hop.id ? { ...i, qty: i.qty + stepKg } : i);
      return [...prev, { hop, qty: stepKg }];
    });
    setCartOpen(true);
  };

  const updateCart = (id, qty) => setCart(prev => prev.map(i => i.hop.id === id ? { ...i, qty } : i));
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.hop.id !== id));

  const submitOrder = async (form, resetForm) => {
    setSubmitting(true);
    const payload = {
      brewery: form.brewery,
      contact: form.contact,
      city: form.city,
      notes: form.notes,
      items: cart.map(i => ({ name: i.hop.name, qty: i.qty, hop_id: i.hop.id }))
    };
    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setCart([]);
        setCartOpen(false);
        resetForm();
        setTimeout(() => setSubmitted(false), 3000);
      } else {
        alert('Помилка: ' + (data.error || 'невідома'));
      }
    } catch (err) {
      alert('Помилка з\'єднання: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cartCount = cart.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e0a] text-white flex items-center justify-center" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-lime-500 mx-auto mb-3" />
          <p className="text-gray-400">Завантажую каталог...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e0a] text-white flex items-center justify-center p-4" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="text-center max-w-md">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-bold mb-1">Помилка завантаження</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e0a] text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {submitted && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-lime-500 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
          <Check size={18} /> Замовлення відправлено
        </div>
      )}
      <header className="sticky top-0 z-30 bg-[#0a0e0a]/95 backdrop-blur-md border-b border-[#2a3a2a]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-lime-500 flex items-center justify-center text-black font-black text-lg">🌿</div>
            <div className="hidden sm:block">
              <div className="font-black text-white leading-tight">HOPPYFREAK</div>
              <div className="text-[10px] text-gray-500 leading-tight">для броварень</div>
            </div>
          </div>
          <div className="flex-1 max-w-md relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input placeholder="Пошук сорту або ферми..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#161c17] border border-[#2a3a2a] text-white text-sm focus:outline-none focus:border-lime-500/50" />
          </div>
          <button onClick={() => setCartOpen(true)} className="relative w-10 h-10 rounded-lg bg-[#161c17] border border-[#2a3a2a] hover:border-lime-500/50 flex items-center justify-center">
            <ShoppingCart size={18} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-lime-500 text-black text-[10px] font-black rounded-full flex items-center justify-center">{cartCount}</span>}
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-2">
          <button onClick={() => setTab('hops')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${tab === 'hops' ? 'bg-lime-500 text-black' : 'bg-[#161c17] text-gray-400 border border-[#2a3a2a]'}`}>Хміль</button>
          <button onClick={() => setTab('shipments')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${tab === 'shipments' ? 'bg-lime-500 text-black' : 'bg-[#161c17] text-gray-400 border border-[#2a3a2a]'}`}>План поставок</button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'hops' && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex gap-1 overflow-x-auto">
                {TYPES.map(t => (
                  <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${type === t ? 'bg-lime-500 text-black' : 'bg-[#161c17] text-gray-400 border border-[#2a3a2a]'}`}>{t}</button>
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setShowOnlyAvail(!showOnlyAvail)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${showOnlyAvail ? 'bg-lime-500 text-black' : 'bg-[#161c17] text-gray-400 border border-[#2a3a2a]'}`}><Check size={12} /> В наявності</button>
                <button onClick={() => setShowOnlyNew(!showOnlyNew)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${showOnlyNew ? 'bg-lime-500 text-black' : 'bg-[#161c17] text-gray-400 border border-[#2a3a2a]'}`}><Sparkles size={12} /> Новинки</button>
              </div>
              <div className="ml-auto relative">
                <select value={sort} onChange={e => setSort(e.target.value)} className="appearance-none pl-8 pr-8 py-1.5 rounded-lg text-xs font-bold bg-[#161c17] text-gray-300 border border-[#2a3a2a] focus:outline-none cursor-pointer">
                  <option value="new">Спершу новинки</option>
                  <option value="name">За назвою</option>
                  <option value="alpha">За alpha</option>
                </select>
                <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-3">{filtered.length} позицій</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(hop => <HopCard key={hop.id} hop={hop} suppliers={suppliers} onAdd={addToCart} onOpen={() => setOpenHop(hop)} />)}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Filter size={48} className="mx-auto mb-3 opacity-30" />
                <p>Нічого не знайдено</p>
              </div>
            )}
          </>
        )}
        {tab === 'shipments' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-lime-500/10 to-transparent border border-lime-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} className="text-lime-400" />
                <h2 className="font-bold text-white">Найближчі поставки</h2>
              </div>
              <p className="text-xs text-gray-400">Можна резервувати з incoming поставок — натисни на сорт з міткою SOLD OUT і вкажи преордер</p>
            </div>
            {shipments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Truck size={48} className="mx-auto mb-3 opacity-30" />
                <p>Найближчих поставок поки немає</p>
              </div>
            ) : shipments.sort((a, b) => new Date(a.eta) - new Date(b.eta)).map(s => <ShipmentCard key={s.id} shipment={s} hops={hops} suppliers={suppliers} />)}
          </div>
        )}
      </main>
      <Cart open={cartOpen} onClose={() => setCartOpen(false)} items={cart} suppliers={suppliers} onUpdate={updateCart} onRemove={removeFromCart} onSubmit={submitOrder} submitting={submitting} />
      <HopDetail hop={openHop} suppliers={suppliers} onClose={() => setOpenHop(null)} onAdd={addToCart} />
    </div>
  );
}
