import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreativesTable } from '../src/components/CreativesTable';
import { processDashboardMetrics } from '../src/utils/metricsCalculator';

const met = ['Criativo A', 'Criativo B'].map((nome, index) => ({
  Data: '07/10/2026', 'NOME DO ANÚNCIO': nome, 'Valor Gasto': `${100 + index * 50},00`,
  'STATUS CAMPANHA': 'PAUSED', 'STATUS CONJUNTO': 'ACTIVE', 'STATUS ANÚNCIO': 'ACTIVE',
}));
const geral = met.map((row, index) => ({
  data_hora: '07/10/2026', uuid: `lead-${index}`, email: `lead-${index}@example.test`,
  'Atribuição': 'Meteórico', utm_content: row['NOME DO ANÚNCIO'], clint: 'NAO',
}));
const metrics = processDashboardMetrics({
  met, geral, main: [], ingressos: [], cadeiras: [], vd: [], gd: [], dc: [],
}, '2026-10-07', '2026-10-07');

test('Meteórico shows paused campaign creatives, with their investment and leads, in Todos', () => {
  const data = metrics.creativesMET;
  assert.equal(data.length, 2);
  assert.equal(data.filter(row => row.ativo).length, 0, 'Do not relabel paused campaigns as active');
  assert.equal(data.reduce((sum, row) => sum + row.leads, 0), metrics.meteorico.leads);
  assert.equal(data.reduce((sum, row) => sum + row.investimento, 0), metrics.meteorico.investimento);
  const html = renderToStaticMarkup(<CreativesTable data={data} initialStatusFilter="todos" />);
  assert.match(html, /Criativo A/);
  assert.match(html, /Criativo B/);
  assert.equal((html.match(/title="Copiar nome do criativo"/g) || []).length, 2);
  assert.doesNotMatch(html, /Nenhum criativo|Os filtros atuais/);
});

test('status filters stay available and explain hidden rows instead of suggesting missing data', () => {
  const data = metrics.creativesMET;
  const activeOnly = renderToStaticMarkup(<CreativesTable data={data} initialStatusFilter="ativos" />);
  assert.match(activeOnly, /Mostrar todos os criativos/);
  assert.equal((activeOnly.match(/title="Copiar nome do criativo"/g) || []).length, 0);
  const inactiveOnly = renderToStaticMarkup(<CreativesTable data={data} initialStatusFilter="inativos" />);
  assert.equal((inactiveOnly.match(/title="Copiar nome do criativo"/g) || []).length, 2);
  const empty = renderToStaticMarkup(<CreativesTable data={[]} initialStatusFilter="todos" />);
  assert.match(empty, /Nenhum criativo encontrado para este período/);
  assert.doesNotMatch(empty, /Mostrar todos os criativos/);
});
