import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardRefreshNotice } from '../src/components/DashboardRefreshNotice';

test('failed refresh labels the last successful data and offers a retry without presenting it as current', () => {
  const html = renderToStaticMarkup(<DashboardRefreshNotice error="Conexão interrompida."
    fetchedAt="2026-10-20T14:00:00Z" loading={false} onRetry={() => {}} />);
  assert.match(html, /role="status"/);
  assert.match(html, /20\/10\/2026.*11:00:00/);
  assert.match(html, /última leitura concluída/);
  assert.match(html, /podem estar desatualizados/);
  assert.match(html, /Tentar novamente/);
  const pending = renderToStaticMarkup(<DashboardRefreshNotice error="Conexão interrompida."
    fetchedAt="2026-10-20T14:00:00Z" loading onRetry={() => {}} />);
  assert.match(pending, /disabled/);
  assert.match(pending, /Tentando atualizar/);
  assert.match(pending, /podem estar desatualizados/);
});
