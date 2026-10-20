import React from 'react';

export function DashboardRefreshNotice({ error, fetchedAt, loading, onRetry }: {
  error: string; fetchedAt?: string; loading: boolean; onRetry: () => void;
}) {
  const lastSuccess = fetchedAt && Number.isFinite(Date.parse(fetchedAt))
    ? new Date(fetchedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
  return (
    <div role="status" className="flex-none flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <div>
        <p className="font-medium">Não foi possível atualizar os dados.</p>
        <p>{error}</p>
        <p className="mt-1 text-xs">Exibindo a última leitura concluída{lastSuccess ? ` em ${lastSuccess}` : ''}. Os números podem estar desatualizados.</p>
      </div>
      <button onClick={onRetry} disabled={loading} className="rounded-md border border-amber-500/30 px-3 py-2 disabled:opacity-50">
        {loading ? 'Tentando atualizar…' : 'Tentar novamente'}
      </button>
    </div>
  );
}
