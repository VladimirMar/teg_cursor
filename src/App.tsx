import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import './App.css'
import { authenticate } from './services/auth'
import { createDreItem, deleteDreItem, listDreItemsPaginated, updateDreItem } from './services/dre'
import type { DreItem } from './services/dre'
import { createModalidadeItem, deleteModalidadeItem, listModalidadeItemsPaginated, updateModalidadeItem } from './services/modalidade'
import type { ModalidadeItem } from './services/modalidade'
import { createCondicaoItem, deleteCondicaoItem, listCondicaoItemsPaginated, updateCondicaoItem } from './services/condicao'
import type { CondicaoItem, CondicaoSortField } from './services/condicao'
import { createTipoBancadaItem, deleteTipoBancadaItem, listTipoBancadaItemsPaginated, updateTipoBancadaItem } from './services/tipoBancada'
import type { TipoBancadaItem } from './services/tipoBancada'
import { createTipoPgtoItem, deleteTipoPgtoItem, listTipoPgtoItemsPaginated, updateTipoPgtoItem } from './services/tipoPgto'
import type { TipoPgtoItem } from './services/tipoPgto'
import {
  createModalidadeTipoBancadaAssociationItem,
  deleteModalidadeTipoBancadaAssociationItem,
  listModalidadeTipoBancadaAssociationItems,
} from './services/modalidadeTipoBancadaAssociacao'
import type { ModalidadeTipoBancadaAssociationItem } from './services/modalidadeTipoBancadaAssociacao'
import {
  createModalBancadaTpPagtoCondicaoItem,
  deleteModalBancadaTpPagtoCondicaoItem,
  listModalBancadaTpPagtoCondicaoItems,
  updateModalBancadaTpPagtoCondicaoItem,
} from './services/modalBancadaTpPagtoCondicao'
import type { ModalBancadaTpPagtoCondicaoItem } from './services/modalBancadaTpPagtoCondicao'
import {
  createModalBancadaTpPagtoCondicaoValorItem,
  deleteModalBancadaTpPagtoCondicaoValorItem,
  listModalBancadaTpPagtoCondicaoValorItems,
  updateModalBancadaTpPagtoCondicaoValorItem,
} from './services/modalBancadaTpPagtoCondicaoValor'
import type { ModalBancadaTpPagtoCondicaoValorItem } from './services/modalBancadaTpPagtoCondicaoValor'
import {
  createKmValorItem,
  deleteKmValorItem,
  listKmValorItems,
  updateKmValorItem,
} from './services/kmValor'
import type { KmValorItem } from './services/kmValor'
import {
  createContinuaValorItem,
  deleteContinuaValorItem,
  listContinuaValorItems,
  updateContinuaValorItem,
} from './services/continuaValor'
import type { ContinuaValorItem, ContinuaValorTipo } from './services/continuaValor'
import {
  createParametroVeiculoItem,
  deleteParametroVeiculoItem,
  listParametroVeiculoItems,
  updateParametroVeiculoItem,
} from './services/parametroVeiculo'
import type { ParametroVeiculoItem } from './services/parametroVeiculo'
import { createTitularItem, deleteTitularItem, listTitularItemsPaginated, updateTitularItem } from './services/titular'
import type { TitularItem } from './services/titular'
import { createMarcaModeloItem, deleteMarcaModeloItem, listMarcaModeloItemsPaginated, updateMarcaModeloItem } from './services/marcaModelo'
import type { MarcaModeloItem } from './services/marcaModelo'
import { createSeguradoraItem, deleteSeguradoraItem, listSeguradoraItemsPaginated, updateSeguradoraItem } from './services/seguradora'
import type { SeguradoraItem } from './services/seguradora'
import { getOrdemServicoDashboardAtivos, getOrdemServicoDashboardAtivosBancada, getOrdemServicoDashboardAtivosDetalhes } from './services/ordemServicoDashboard'
import type {
  OrdemServicoDashboardBancadaData,
  OrdemServicoDashboardData,
  OrdemServicoDashboardDetailData,
  OrdemServicoDashboardDetailItem,
} from './services/ordemServicoDashboard'

type DashboardBancadaMatrixRow = {
  dreCodigo: string
  dreDescricao: string
  totalGeral: number
  totalsByModalidade: Record<string, number>
  countsByModalidadeAndTipo: Record<string, Record<string, number>>
}

type StatusTone = 'idle' | 'error' | 'success'

async function getTermoCountByStatus(statusTermo: string): Promise<number> {
  const params = new URLSearchParams({
    statusTermo,
    page: '1',
    pageSize: '1',
  })
  const response = await fetch(`/api/termo?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao carregar a contagem de termos.')
  }

  return typeof payload.total === 'number' ? payload.total : 0
}

async function getOrdemServicoCountBySituacao(situacao: string): Promise<number> {
  const params = new URLSearchParams({
    situacao,
    page: '1',
    pageSize: '1',
  })
  const response = await fetch(`/api/ordem-servico?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao carregar a contagem de Ordens de Servico.')
  }

  return typeof payload.total === 'number' ? payload.total : 0
}

type ActiveView = 'inicio' | 'dre' | 'modalidade' | 'condicao' | 'tipoPgto' | 'modalBancadaTpPagtoCondicao' | 'modalBancadaTpPagtoCondicaoValor' | 'kmValor' | 'continuaValor' | 'parametroVeiculo' | 'tipoBancada' | 'titular' | 'marcaModelo' | 'seguradora' | 'troca' | 'acesso' | 'loginDre' | 'condutor' | 'monitor' | 'credenciada' | 'credenciamentoTermo' | 'emissaoDocumentoParametro' | 'veiculo' | 'veiculoHistorico' | 'vinculoCondutor' | 'vinculoMonitor' | 'ordemServico' | 'cep' | 'smoke'
type SmokeSuite = 'all' | 'condutor' | 'credenciada' | 'veiculo' | 'marca-modelo'
type SmokeLogStream = 'stdout' | 'stderr'
type DreSortField = 'codigo' | 'descricao'
type DreSortDirection = 'asc' | 'desc'
type TitularSortField = 'codigo' | 'cnpj_cpf' | 'titular'
type MarcaModeloSortField = 'codigo' | 'descricao'
type SeguradoraSortField = 'codigo' | 'controle' | 'descricao'
type FormMode = 'create' | 'edit' | 'view'
type CollapsedMenuGroup = 'cadastros' | 'operacional' | 'condutor' | 'monitor' | 'veiculo' | 'acesso' | 'cadastrosOperacional' | 'cadastrosFinanceiro'

type DashboardDrillDownContext = {
  dreCodigo: string
  dreDescricao: string
  modalidadeDescricao: string
  tipoDeBancada?: string
  total: number
}

const formatModalBancadaTpPagtoCondicaoLabel = (
  item: Pick<ModalBancadaTpPagtoCondicaoItem, 'modalidadeDescricao' | 'tipoBancadaDescricao' | 'tipoPgtoDescricao' | 'condicaoDescricao'>,
) => {
  return `${item.modalidadeDescricao} / ${item.tipoBancadaDescricao} / ${item.tipoPgtoDescricao} / ${item.condicaoDescricao}`
}

const formatModalidadeTipoBancadaLabel = (
  item: Pick<ModalidadeTipoBancadaAssociationItem, 'modalidadeDescricao' | 'tipoBancadaDescricao'>,
) => {
  return `${item.modalidadeDescricao} / ${item.tipoBancadaDescricao}`
}

const currencyInputFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const normalizeCurrencyInput = (value: string) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ''
  }

  const decimalCandidate = trimmedValue.replace(/\s+/g, '')

  if (/^-?\d+(?:\.\d+)?$/.test(decimalCandidate)) {
    return Number(decimalCandidate).toFixed(2)
  }

  const digitsOnly = trimmedValue.replace(/\D/g, '')

  if (!digitsOnly) {
    return ''
  }

  return (Number(digitsOnly) / 100).toFixed(2)
}

const formatCurrencyInput = (value: string | number) => {
  const normalizedValue = typeof value === 'number'
    ? value.toFixed(2)
    : normalizeCurrencyInput(value)

  if (!normalizedValue) {
    return ''
  }

  const parsedValue = Number(normalizedValue)

  if (!Number.isFinite(parsedValue)) {
    return ''
  }

  return currencyInputFormatter.format(parsedValue)
}

const CONTINUA_TIPO_OPTIONS: ContinuaValorTipo[] = ['Regular', 'Cadeirante']
const PARAMETRO_VEICULO_CONDICAO_OPTIONS = ['Capacidade', 'Desconto/ Viagem', 'Viagem'] as const

const getDefaultCollapsedMenuGroups = (): Record<CollapsedMenuGroup, boolean> => ({
  cadastros: true,
  operacional: true,
  condutor: true,
  monitor: true,
  veiculo: true,
  acesso: true,
  cadastrosOperacional: true,
  cadastrosFinanceiro: true,
})

const getExpandedGroupsForView = (view: ActiveView): CollapsedMenuGroup[] => {
  switch (view) {
    case 'titular':
    case 'credenciada':
    case 'credenciamentoTermo':
    case 'ordemServico':
      return ['operacional']
    case 'condutor':
    case 'vinculoCondutor':
      return ['operacional', 'condutor']
    case 'monitor':
    case 'vinculoMonitor':
      return ['operacional', 'monitor']
    case 'veiculo':
    case 'veiculoHistorico':
      return ['operacional', 'veiculo']
    case 'dre':
    case 'modalidade':
    case 'tipoBancada':
    case 'marcaModelo':
    case 'seguradora':
    case 'troca':
    case 'emissaoDocumentoParametro':
    case 'cep':
    case 'smoke':
      return ['cadastros', 'cadastrosOperacional']
    case 'condicao':
    case 'tipoPgto':
    case 'modalBancadaTpPagtoCondicao':
    case 'modalBancadaTpPagtoCondicaoValor':
    case 'kmValor':
    case 'continuaValor':
    case 'parametroVeiculo':
      return ['cadastros', 'cadastrosFinanceiro']
    case 'acesso':
    case 'loginDre':
      return ['acesso']
    default:
      return []
  }
}

type SmokeSkippedRecord = {
  index: number
  codigoXml?: string
  message: string
}

type SmokeImportSummary = {
  label: string
  fileName: string
  total: number
  processed: number
  inserted: number
  updated: number
  skipped: number
  skippedRecords: SmokeSkippedRecord[]
}

type SmokeRunReport = {
  requestedSuite: string
  status: string
  startedAt: string
  finishedAt: string | null
  failureMessage: string
  executedSuites: Array<{
    name: string
    status: string
    startedAt?: string
    finishedAt?: string | null
    failureMessage?: string
    imports?: SmokeImportSummary[]
  }>
}

type SmokeInvalidFixtureReport = {
  requestedSuite: string
  status: string
  startedAt: string
  finishedAt: string | null
  failureMessage: string
  executedSuites: Array<{
    suite: string
    fileName: string
    status: string
    startedAt: string
    finishedAt: string | null
    failureMessage: string
    importSummary: Omit<SmokeImportSummary, 'label' | 'fileName'> | null
    rejectionReasons: string[]
  }>
}

type SmokeRunResponse = {
  message: string
  suite: string
  scriptName: string
  status: string
  exitCode: number
  reportPath: string
  report: SmokeRunReport | null
  stdoutTail: string
  stderrTail: string
  invalidFixtureStatus: string
  invalidFixtureReportPath: string
  invalidFixtureReport: SmokeInvalidFixtureReport | null
}

const smokeSuiteOptions: Array<{ value: SmokeSuite, label: string }> = [
  { value: 'all', label: 'Aplicacao completa' },
  { value: 'condutor', label: 'Condutor' },
  { value: 'credenciada', label: 'Credenciada' },
  { value: 'veiculo', label: 'Veiculo' },
  { value: 'marca-modelo', label: 'Marca/Modelo' },
]

type StoredSession = {
  email: string
  displayName: string
  token: string | null
  user: unknown
  payload: Record<string, unknown>
  authenticatedAt: string
}

const SESSION_STORAGE_KEY = 'tegfinanc.auth'
const DRE_PAGE_SIZE = 20
const SIDEBAR_AUTO_HIDE_DELAY_MS = 4000

const normalizeDreSiglaInput = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)

function getCurrentMonthInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatDashboardMonthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return value
  }

  const [yearText, monthText] = value.split('-')
  const monthDate = new Date(Number(yearText), Number(monthText) - 1, 1)

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(monthDate)
}

function formatDashboardGeneratedAt(value: string) {
  const generatedDate = new Date(value)

  if (Number.isNaN(generatedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(generatedDate)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeDashboardDrillDownSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function buildDashboardReportMarkup(dashboardData: OrdemServicoDashboardData, options?: { autoPrint?: boolean }) {
  const monthLabel = formatDashboardMonthLabel(dashboardData.requestedMonth)
  const generatedAt = formatDashboardGeneratedAt(dashboardData.generatedAt)
  const autoPrint = Boolean(options?.autoPrint)
  const tableRows = dashboardData.rows
    .map((row) => {
      const modalidadeCells = dashboardData.modalidades
        .map((modalidade) => `<td class="report-number">${row.countsByModalidade[modalidade.descricao] ?? 0}</td>`)
        .join('')

      return `
        <tr>
          <td>
            <div class="report-dre-cell">
              <strong>${escapeHtml(row.dreCodigo)}</strong>
              <span>${escapeHtml(row.dreDescricao)}</span>
            </div>
          </td>
          ${modalidadeCells}
          <td class="report-number report-total-cell">${row.totalGeral}</td>
        </tr>`
    })
    .join('')

  const totalCells = dashboardData.modalidades
    .map((modalidade) => `<th class="report-number">${modalidade.total}</th>`)
    .join('')

  const printScript = autoPrint
    ? `
    <script>
      window.addEventListener('load', function () {
        window.focus();
        window.print();
      });

      window.addEventListener('afterprint', function () {
        window.close();
      });
    </script>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Dashboard OrdemServico ${escapeHtml(dashboardData.requestedMonth)}</title>
    <style>
      body {
        margin: 24px;
        font-family: Calibri, Arial, sans-serif;
        color: #111827;
      }

      .report-header {
        margin-bottom: 18px;
      }

      .report-header h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }

      .report-header p {
        margin: 4px 0;
        font-size: 13px;
      }

      .report-table,
      .report-person-table {
        width: 100%;
        border-collapse: collapse;
      }

      .report-table {
        table-layout: fixed;
      }

      .report-table th,
      .report-table td,
      .report-person-table th,
      .report-person-table td {
        border: 1px solid #6b7280;
        padding: 6px 8px;
        font-size: 12px;
      }

      .report-table thead th,
      .report-table tfoot th,
      .report-person-table th {
        background: #e5e7eb;
      }

      .report-table th:first-child,
      .report-table td:first-child {
        text-align: left;
      }

      .report-number {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .report-dre-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .report-dre-cell span {
        color: #4b5563;
      }

      .report-total-cell {
        font-weight: 700;
      }

      .report-footer {
        margin-top: 18px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
      }

      .report-person-table {
        max-width: 420px;
      }

      .report-generated {
        min-width: 220px;
        text-align: right;
      }

      .report-generated p {
        margin: 4px 0;
        font-size: 13px;
      }

      @media print {
        body {
          margin: 12px;
        }
      }
    </style>
  </head>
  <body>
    <header class="report-header">
      <h1>Ordens de Servico Ativas por DRE e Modalidade</h1>
      <p><strong>Mes:</strong> ${escapeHtml(monthLabel)}</p>
      <p><strong>Gerado em:</strong> ${escapeHtml(generatedAt)}</p>
    </header>
    <section>
      <table class="report-table">
        <thead>
          <tr>
            <th>DRE</th>
            ${dashboardData.modalidades.map((modalidade) => `<th>${escapeHtml(modalidade.descricao)}</th>`).join('')}
            <th>Total Geral</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            ${totalCells}
            <th class="report-number">${dashboardData.totals.totalOverall}</th>
          </tr>
        </tfoot>
      </table>
    </section>
    <section class="report-footer">
      <table class="report-person-table">
        <tbody>
          <tr>
            <th>PESSOA FISICA</th>
            <td class="report-number">${dashboardData.personTypeTotals.pessoaFisica}</td>
          </tr>
          <tr>
            <th>PESSOA JURIDICA</th>
            <td class="report-number">${dashboardData.personTypeTotals.pessoaJuridica}</td>
          </tr>
          <tr>
            <th>COOPERATIVA</th>
            <td class="report-number">${dashboardData.personTypeTotals.cooperativa}</td>
          </tr>
        </tbody>
      </table>
      <div class="report-generated">
        <p><strong>Data da geracao:</strong></p>
        <p>${escapeHtml(generatedAt)}</p>
      </div>
    </section>${printScript}
  </body>
</html>`
}

function getDashboardBancadaLayout(dashboardBancadaData: OrdemServicoDashboardBancadaData) {
  const modalidades = Array.from(new Set(dashboardBancadaData.rows.map((row) => row.modalidadeDescricao)))
    .sort((left, right) => left.localeCompare(right, 'pt-BR'))

  const totalsByModalidade = modalidades.reduce<Record<string, {
    totalGeral: number
    countsByTipoBancada: Record<string, number>
  }>>((accumulator, modalidadeDescricao) => {
    accumulator[modalidadeDescricao] = {
      totalGeral: 0,
      countsByTipoBancada: {},
    }

    return accumulator
  }, {})

  const matrixRows = Array.from(dashboardBancadaData.rows.reduce((accumulator, row) => {
    if (!accumulator.has(row.dreCodigo)) {
      accumulator.set(row.dreCodigo, {
        dreCodigo: row.dreCodigo,
        dreDescricao: row.dreDescricao,
        totalGeral: 0,
        totalsByModalidade: {},
        countsByModalidadeAndTipo: {},
      })
    }

    const currentRow = accumulator.get(row.dreCodigo) as DashboardBancadaMatrixRow
    currentRow.totalGeral += row.totalGeral
    currentRow.totalsByModalidade[row.modalidadeDescricao] = row.totalGeral
    currentRow.countsByModalidadeAndTipo[row.modalidadeDescricao] = row.countsByTipoBancada

    if (!totalsByModalidade[row.modalidadeDescricao]) {
      totalsByModalidade[row.modalidadeDescricao] = {
        totalGeral: 0,
        countsByTipoBancada: {},
      }
    }

    totalsByModalidade[row.modalidadeDescricao].totalGeral += row.totalGeral

    for (const tipoBancada of dashboardBancadaData.tiposBancada) {
      totalsByModalidade[row.modalidadeDescricao].countsByTipoBancada[tipoBancada.descricao] =
        (totalsByModalidade[row.modalidadeDescricao].countsByTipoBancada[tipoBancada.descricao] ?? 0)
        + (row.countsByTipoBancada[tipoBancada.descricao] ?? 0)
    }

    return accumulator
  }, new Map<string, DashboardBancadaMatrixRow>()).values())
    .sort((left, right) => left.dreCodigo.localeCompare(right.dreCodigo, 'pt-BR'))

  const visibleTiposByModalidade = modalidades.reduce<Record<string, string[]>>((accumulator, modalidadeDescricao) => {
    accumulator[modalidadeDescricao] = dashboardBancadaData.tiposBancada
      .filter((tipoBancada) => (totalsByModalidade[modalidadeDescricao]?.countsByTipoBancada[tipoBancada.descricao] ?? 0) > 0)
      .map((tipoBancada) => tipoBancada.descricao)

    return accumulator
  }, {})

  return {
    modalidades,
    matrixRows,
    totalsByModalidade,
    visibleTiposByModalidade,
  }
}

function buildDashboardBancadaReportMarkup(dashboardBancadaData: OrdemServicoDashboardBancadaData, options?: { autoPrint?: boolean }) {
  const monthLabel = formatDashboardMonthLabel(dashboardBancadaData.requestedMonth)
  const generatedAt = formatDashboardGeneratedAt(dashboardBancadaData.generatedAt)
  const autoPrint = Boolean(options?.autoPrint)
  const layout = getDashboardBancadaLayout(dashboardBancadaData)

  const headerTopCells = layout.modalidades
    .map((modalidadeDescricao) => `<th colspan="${layout.visibleTiposByModalidade[modalidadeDescricao]?.length ?? 0}">${escapeHtml(modalidadeDescricao)}</th>`)
    .join('')

  const headerBottomCells = layout.modalidades
    .flatMap((modalidadeDescricao) => (layout.visibleTiposByModalidade[modalidadeDescricao] ?? [])
      .map((tipoBancadaDescricao) => `<th>${escapeHtml(tipoBancadaDescricao)}</th>`))
    .join('')

  const bodyRows = layout.matrixRows
    .map((row) => {
      const bancadaCells = layout.modalidades
        .flatMap((modalidadeDescricao) => (layout.visibleTiposByModalidade[modalidadeDescricao] ?? [])
          .map((tipoBancadaDescricao) => `<td class="report-number">${row.countsByModalidadeAndTipo[modalidadeDescricao]?.[tipoBancadaDescricao] ?? 0}</td>`))
        .join('')

      return `
        <tr>
          <td>
            <div class="report-dre-cell">
              <strong>${escapeHtml(row.dreCodigo)}</strong>
              <span>${escapeHtml(row.dreDescricao)}</span>
            </div>
          </td>
          ${bancadaCells}
          <td class="report-number report-total-cell">${row.totalGeral}</td>
        </tr>`
    })
    .join('')

  const totalCells = layout.modalidades
    .flatMap((modalidadeDescricao) => (layout.visibleTiposByModalidade[modalidadeDescricao] ?? [])
      .map((tipoBancadaDescricao) => `<th class="report-number">${layout.totalsByModalidade[modalidadeDescricao]?.countsByTipoBancada[tipoBancadaDescricao] ?? 0}</th>`))
    .join('')

  const printScript = autoPrint
    ? `
    <script>
      window.addEventListener('load', function () {
        window.focus();
        window.print();
      });

      window.addEventListener('afterprint', function () {
        window.close();
      });
    </script>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Dashboard Bancada ${escapeHtml(dashboardBancadaData.requestedMonth)}</title>
    <style>
      body { margin: 24px; font-family: Calibri, Arial, sans-serif; color: #111827; }
      .report-header { margin-bottom: 18px; }
      .report-header h1 { margin: 0 0 8px; font-size: 24px; }
      .report-header p { margin: 4px 0; font-size: 13px; }
      .report-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .report-table th, .report-table td { border: 1px solid #6b7280; padding: 6px 8px; font-size: 12px; }
      .report-table thead th, .report-table tfoot th { background: #e5e7eb; }
      .report-table th:first-child, .report-table td:first-child { text-align: left; }
      .report-number { text-align: right; font-variant-numeric: tabular-nums; }
      .report-dre-cell { display: flex; flex-direction: column; gap: 2px; }
      .report-dre-cell span { color: #4b5563; }
      .report-total-cell { font-weight: 700; }
      @media print { body { margin: 12px; } }
    </style>
  </head>
  <body>
    <header class="report-header">
      <h1>Ordens de Servico Ativas por DRE, Modalidade e Tipo de Bancada</h1>
      <p><strong>Mes:</strong> ${escapeHtml(monthLabel)}</p>
      <p><strong>Gerado em:</strong> ${escapeHtml(generatedAt)}</p>
    </header>
    <section>
      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2">DRE</th>
            ${headerTopCells}
            <th rowspan="2">Total Geral</th>
          </tr>
          <tr>
            ${headerBottomCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            ${totalCells}
            <th class="report-number">${dashboardBancadaData.totals.totalOverall}</th>
          </tr>
        </tfoot>
      </table>
    </section>${printScript}
  </body>
</html>`
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

function getStoredSession() {
  const storedValue = sessionStorage.getItem(SESSION_STORAGE_KEY)

  if (!storedValue) {
    return null
  }

  try {
    return JSON.parse(storedValue) as StoredSession
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

function getUserDisplayName(user: unknown, fallbackEmail: string) {
  if (user && typeof user === 'object') {
    const candidateName = 'name' in user ? user.name : null
    if (typeof candidateName === 'string' && candidateName.trim()) {
      return candidateName.trim()
    }

    const candidateEmail = 'email' in user ? user.email : null
    if (typeof candidateEmail === 'string' && candidateEmail.trim()) {
      return candidateEmail.trim()
    }
  }

  return fallbackEmail
}

function formatCpfOrCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  if (digits.length <= 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

function getSmokeReportFileName(result: SmokeRunResponse | null) {
  if (!result?.reportPath) {
    return 'smoke-report.json'
  }

  const normalizedPath = result.reportPath.replace(/\\/g, '/')
  const segments = normalizedPath.split('/')
  return segments[segments.length - 1] || 'smoke-report.json'
}

function App() {
  const environmentName = import.meta.env.VITE_APP_ENV_NAME?.trim() ?? ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [session, setSession] = useState<StoredSession | null>(null)
  const [activeView, setActiveView] = useState<ActiveView>('inicio')
  const [collapsedMenuGroups, setCollapsedMenuGroups] = useState<Record<CollapsedMenuGroup, boolean>>(getDefaultCollapsedMenuGroups)
  const [isRunningSmoke, setIsRunningSmoke] = useState(false)
  const [selectedSmokeSuite, setSelectedSmokeSuite] = useState<SmokeSuite>('all')
  const [smokeStatusMessage, setSmokeStatusMessage] = useState('')
  const [smokeStatusTone, setSmokeStatusTone] = useState<StatusTone>('idle')
  const [smokeStdout, setSmokeStdout] = useState('')
  const [smokeStderr, setSmokeStderr] = useState('')
  const [selectedSmokeLogStream, setSelectedSmokeLogStream] = useState<SmokeLogStream>('stdout')
  const [smokeReportActionMessage, setSmokeReportActionMessage] = useState('')
  const [smokeResult, setSmokeResult] = useState<SmokeRunResponse | null>(null)
  const [dashboardMonth, setDashboardMonth] = useState(getCurrentMonthInputValue())
  const [dashboardData, setDashboardData] = useState<OrdemServicoDashboardData | null>(null)
  const [dashboardBancadaData, setDashboardBancadaData] = useState<OrdemServicoDashboardBancadaData | null>(null)
  const [dashboardStatusMessage, setDashboardStatusMessage] = useState('')
  const [dashboardStatusTone, setDashboardStatusTone] = useState<StatusTone>('idle')
  const [termoAtivosCount, setTermoAtivosCount] = useState(0)
  const [termoRescindidosCount, setTermoRescindidosCount] = useState(0)
  const [osCanceladasCount, setOsCanceladasCount] = useState(0)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [isDashboardResumoExpanded, setIsDashboardResumoExpanded] = useState(false)
  const [isDashboardBancadaExpanded, setIsDashboardBancadaExpanded] = useState(false)
  const [isDashboardDrillDownVisible, setIsDashboardDrillDownVisible] = useState(false)
  const [isLoadingDashboardDrillDown, setIsLoadingDashboardDrillDown] = useState(false)
  const [dashboardDrillDownContext, setDashboardDrillDownContext] = useState<DashboardDrillDownContext | null>(null)
  const [dashboardDrillDownData, setDashboardDrillDownData] = useState<OrdemServicoDashboardDetailData | null>(null)
  const [dashboardDrillDownSearch, setDashboardDrillDownSearch] = useState('')
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [dashboardDrillDownStatusMessage, setDashboardDrillDownStatusMessage] = useState('')
  const [isDashboardOsPopupVisible, setIsDashboardOsPopupVisible] = useState(false)
  const [dashboardOsPopupUrl, setDashboardOsPopupUrl] = useState('')
  const sidebarAutoHideTimeoutRef = useRef<number | null>(null)
  const isSidebarHoveredRef = useRef(false)
  const [dreItems, setDreItems] = useState<DreItem[]>([])
  const [dreSigla, setDreSigla] = useState('')
  const [dreSiglaError, setDreSiglaError] = useState('')
  const [dreDescricao, setDreDescricao] = useState('')
  const [dreDescricaoError, setDreDescricaoError] = useState('')
  const [dreStatusMessage, setDreStatusMessage] = useState('')
  const [dreStatusTone, setDreStatusTone] = useState<StatusTone>('idle')
  const [isLoadingDre, setIsLoadingDre] = useState(false)
  const [isSavingDre, setIsSavingDre] = useState(false)
  const [isDeletingDre, setIsDeletingDre] = useState(false)
  const [isDreFormVisible, setIsDreFormVisible] = useState(false)
  const [editingDreCodigo, setEditingDreCodigo] = useState<string | null>(null)
  const [dreFormMode, setDreFormMode] = useState<FormMode>('create')
  const [dreSearch, setDreSearch] = useState('')
  const [drePage, setDrePage] = useState(1)
  const [dreTotalItems, setDreTotalItems] = useState(0)
  const [dreTotalPages, setDreTotalPages] = useState(1)
  const [dreSortBy, setDreSortBy] = useState<DreSortField>('codigo')
  const [dreSortDirection, setDreSortDirection] = useState<DreSortDirection>('asc')
  const deferredDreSearch = useDeferredValue(dreSearch)
  const [modalidadeItems, setModalidadeItems] = useState<ModalidadeItem[]>([])
  const [modalidadeDescricao, setModalidadeDescricao] = useState('')
  const [modalidadeDescricaoError, setModalidadeDescricaoError] = useState('')
  const [modalidadeStatusMessage, setModalidadeStatusMessage] = useState('')
  const [modalidadeStatusTone, setModalidadeStatusTone] = useState<StatusTone>('idle')
  const [isLoadingModalidade, setIsLoadingModalidade] = useState(false)
  const [isSavingModalidade, setIsSavingModalidade] = useState(false)
  const [isDeletingModalidade, setIsDeletingModalidade] = useState(false)
  const [isModalidadeFormVisible, setIsModalidadeFormVisible] = useState(false)
  const [editingModalidadeCodigo, setEditingModalidadeCodigo] = useState<string | null>(null)
  const [modalidadeFormMode, setModalidadeFormMode] = useState<FormMode>('create')
  const [modalidadeSearch, setModalidadeSearch] = useState('')
  const [modalidadePage, setModalidadePage] = useState(1)
  const [modalidadeTotalItems, setModalidadeTotalItems] = useState(0)
  const [modalidadeTotalPages, setModalidadeTotalPages] = useState(1)
  const [modalidadeSortBy, setModalidadeSortBy] = useState<DreSortField>('codigo')
  const [modalidadeSortDirection, setModalidadeSortDirection] = useState<DreSortDirection>('asc')
  const deferredModalidadeSearch = useDeferredValue(modalidadeSearch)
  const [condicaoItems, setCondicaoItems] = useState<CondicaoItem[]>([])
  const [condicaoDescricao, setCondicaoDescricao] = useState('')
  const [condicaoDescricaoError, setCondicaoDescricaoError] = useState('')
  const [condicaoQtdeIni, setCondicaoQtdeIni] = useState('')
  const [condicaoQtdeIniError, setCondicaoQtdeIniError] = useState('')
  const [condicaoQtdeFim, setCondicaoQtdeFim] = useState('')
  const [condicaoQtdeFimError, setCondicaoQtdeFimError] = useState('')
  const [condicaoStatusMessage, setCondicaoStatusMessage] = useState('')
  const [condicaoStatusTone, setCondicaoStatusTone] = useState<StatusTone>('idle')
  const [isLoadingCondicao, setIsLoadingCondicao] = useState(false)
  const [isSavingCondicao, setIsSavingCondicao] = useState(false)
  const [isDeletingCondicao, setIsDeletingCondicao] = useState(false)
  const [isCondicaoFormVisible, setIsCondicaoFormVisible] = useState(false)
  const [editingCondicaoCodigo, setEditingCondicaoCodigo] = useState<string | null>(null)
  const [condicaoFormMode, setCondicaoFormMode] = useState<FormMode>('create')
  const [condicaoSearch, setCondicaoSearch] = useState('')
  const [condicaoPage, setCondicaoPage] = useState(1)
  const [condicaoTotalItems, setCondicaoTotalItems] = useState(0)
  const [condicaoTotalPages, setCondicaoTotalPages] = useState(1)
  const [condicaoSortBy, setCondicaoSortBy] = useState<CondicaoSortField>('codigo')
  const [condicaoSortDirection, setCondicaoSortDirection] = useState<DreSortDirection>('asc')
  const deferredCondicaoSearch = useDeferredValue(condicaoSearch)
  const [tipoBancadaItems, setTipoBancadaItems] = useState<TipoBancadaItem[]>([])
  const [tipoBancadaDescricao, setTipoBancadaDescricao] = useState('')
  const [tipoBancadaDescricaoError, setTipoBancadaDescricaoError] = useState('')
  const [tipoBancadaStatusMessage, setTipoBancadaStatusMessage] = useState('')
  const [tipoBancadaStatusTone, setTipoBancadaStatusTone] = useState<StatusTone>('idle')
  const [isLoadingTipoBancada, setIsLoadingTipoBancada] = useState(false)
  const [isSavingTipoBancada, setIsSavingTipoBancada] = useState(false)
  const [isDeletingTipoBancada, setIsDeletingTipoBancada] = useState(false)
  const [isTipoBancadaFormVisible, setIsTipoBancadaFormVisible] = useState(false)
  const [editingTipoBancadaCodigo, setEditingTipoBancadaCodigo] = useState<string | null>(null)
  const [tipoBancadaFormMode, setTipoBancadaFormMode] = useState<FormMode>('create')
  const [tipoBancadaSearch, setTipoBancadaSearch] = useState('')
  const [tipoBancadaPage, setTipoBancadaPage] = useState(1)
  const [tipoBancadaTotalItems, setTipoBancadaTotalItems] = useState(0)
  const [tipoBancadaTotalPages, setTipoBancadaTotalPages] = useState(1)
  const [tipoBancadaSortBy, setTipoBancadaSortBy] = useState<DreSortField>('codigo')
  const [tipoBancadaSortDirection, setTipoBancadaSortDirection] = useState<DreSortDirection>('asc')
  const deferredTipoBancadaSearch = useDeferredValue(tipoBancadaSearch)
  const [tipoPgtoItems, setTipoPgtoItems] = useState<TipoPgtoItem[]>([])
  const [tipoPgtoDescricao, setTipoPgtoDescricao] = useState('')
  const [tipoPgtoDescricaoError, setTipoPgtoDescricaoError] = useState('')
  const [tipoPgtoStatusMessage, setTipoPgtoStatusMessage] = useState('')
  const [tipoPgtoStatusTone, setTipoPgtoStatusTone] = useState<StatusTone>('idle')
  const [isLoadingTipoPgto, setIsLoadingTipoPgto] = useState(false)
  const [isSavingTipoPgto, setIsSavingTipoPgto] = useState(false)
  const [isDeletingTipoPgto, setIsDeletingTipoPgto] = useState(false)
  const [isTipoPgtoFormVisible, setIsTipoPgtoFormVisible] = useState(false)
  const [editingTipoPgtoCodigo, setEditingTipoPgtoCodigo] = useState<string | null>(null)
  const [tipoPgtoFormMode, setTipoPgtoFormMode] = useState<FormMode>('create')
  const [tipoPgtoSearch, setTipoPgtoSearch] = useState('')
  const [tipoPgtoPage, setTipoPgtoPage] = useState(1)
  const [tipoPgtoTotalItems, setTipoPgtoTotalItems] = useState(0)
  const [tipoPgtoTotalPages, setTipoPgtoTotalPages] = useState(1)
  const [tipoPgtoSortBy, setTipoPgtoSortBy] = useState<DreSortField>('codigo')
  const [tipoPgtoSortDirection, setTipoPgtoSortDirection] = useState<DreSortDirection>('asc')
  const deferredTipoPgtoSearch = useDeferredValue(tipoPgtoSearch)
  const [tipoBancadaAssociationItems, setTipoBancadaAssociationItems] = useState<ModalidadeTipoBancadaAssociationItem[]>([])
  const [associationModalidadeCodigo, setAssociationModalidadeCodigo] = useState('')
  const [associationTipoBancadaCodigo, setAssociationTipoBancadaCodigo] = useState('')
  const [associationStatusMessage, setAssociationStatusMessage] = useState('')
  const [associationStatusTone, setAssociationStatusTone] = useState<StatusTone>('idle')
  const [associationModalidadeOptions, setAssociationModalidadeOptions] = useState<ModalidadeItem[]>([])
  const [associationTipoBancadaOptions, setAssociationTipoBancadaOptions] = useState<TipoBancadaItem[]>([])
  const [isLoadingAssociationOptions, setIsLoadingAssociationOptions] = useState(false)
  const [isLoadingTipoBancadaAssociations, setIsLoadingTipoBancadaAssociations] = useState(false)
  const [isSavingTipoBancadaAssociation, setIsSavingTipoBancadaAssociation] = useState(false)
  const [isDeletingTipoBancadaAssociation, setIsDeletingTipoBancadaAssociation] = useState(false)
  const [modalBancadaTpPagtoCondicaoItems, setModalBancadaTpPagtoCondicaoItems] = useState<ModalBancadaTpPagtoCondicaoItem[]>([])
  const [modalBancadaTpPagtoCondicaoAssociationCodigo, setModalBancadaTpPagtoCondicaoAssociationCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoTipoPgtoCodigo, setModalBancadaTpPagtoCondicaoTipoPgtoCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoCondicaoCodigo, setModalBancadaTpPagtoCondicaoCondicaoCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoStatusMessage, setModalBancadaTpPagtoCondicaoStatusMessage] = useState('')
  const [modalBancadaTpPagtoCondicaoStatusTone, setModalBancadaTpPagtoCondicaoStatusTone] = useState<StatusTone>('idle')
  const [modalBancadaTpPagtoCondicaoAssociationOptions, setModalBancadaTpPagtoCondicaoAssociationOptions] = useState<ModalidadeTipoBancadaAssociationItem[]>([])
  const [modalBancadaTpPagtoCondicaoTipoPgtoOptions, setModalBancadaTpPagtoCondicaoTipoPgtoOptions] = useState<TipoPgtoItem[]>([])
  const [modalBancadaTpPagtoCondicaoCondicaoOptions, setModalBancadaTpPagtoCondicaoCondicaoOptions] = useState<CondicaoItem[]>([])
  const [isLoadingModalBancadaTpPagtoCondicaoOptions, setIsLoadingModalBancadaTpPagtoCondicaoOptions] = useState(false)
  const [isLoadingModalBancadaTpPagtoCondicaoItems, setIsLoadingModalBancadaTpPagtoCondicaoItems] = useState(false)
  const [isSavingModalBancadaTpPagtoCondicao, setIsSavingModalBancadaTpPagtoCondicao] = useState(false)
  const [isDeletingModalBancadaTpPagtoCondicao, setIsDeletingModalBancadaTpPagtoCondicao] = useState(false)
  const [isModalBancadaTpPagtoCondicaoFormVisible, setIsModalBancadaTpPagtoCondicaoFormVisible] = useState(false)
  const [editingModalBancadaTpPagtoCondicaoCodigo, setEditingModalBancadaTpPagtoCondicaoCodigo] = useState<string | null>(null)
  const [modalBancadaTpPagtoCondicaoFormMode, setModalBancadaTpPagtoCondicaoFormMode] = useState<FormMode>('create')
  const [modalBancadaTpPagtoCondicaoFilterAssociationCodigo, setModalBancadaTpPagtoCondicaoFilterAssociationCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo, setModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoFilterCondicaoCodigo, setModalBancadaTpPagtoCondicaoFilterCondicaoCodigo] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo, setAppliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo, setAppliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo, setAppliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoPage, setModalBancadaTpPagtoCondicaoPage] = useState(1)
  const [modalBancadaTpPagtoCondicaoTotalItems, setModalBancadaTpPagtoCondicaoTotalItems] = useState(0)
  const [modalBancadaTpPagtoCondicaoTotalPages, setModalBancadaTpPagtoCondicaoTotalPages] = useState(1)
  const [modalBancadaTpPagtoCondicaoValorItems, setModalBancadaTpPagtoCondicaoValorItems] = useState<ModalBancadaTpPagtoCondicaoValorItem[]>([])
  const [modalBancadaTpPagtoCondicaoValorAssociationCodigo, setModalBancadaTpPagtoCondicaoValorAssociationCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoValorData, setModalBancadaTpPagtoCondicaoValorData] = useState('')
  const [modalBancadaTpPagtoCondicaoValorValor, setModalBancadaTpPagtoCondicaoValorValor] = useState('')
  const [modalBancadaTpPagtoCondicaoValorStatusMessage, setModalBancadaTpPagtoCondicaoValorStatusMessage] = useState('')
  const [modalBancadaTpPagtoCondicaoValorStatusTone, setModalBancadaTpPagtoCondicaoValorStatusTone] = useState<StatusTone>('idle')
  const [modalBancadaTpPagtoCondicaoValorOptions, setModalBancadaTpPagtoCondicaoValorOptions] = useState<ModalBancadaTpPagtoCondicaoItem[]>([])
  const [isLoadingModalBancadaTpPagtoCondicaoValorOptions, setIsLoadingModalBancadaTpPagtoCondicaoValorOptions] = useState(false)
  const [isLoadingModalBancadaTpPagtoCondicaoValorItems, setIsLoadingModalBancadaTpPagtoCondicaoValorItems] = useState(false)
  const [isSavingModalBancadaTpPagtoCondicaoValor, setIsSavingModalBancadaTpPagtoCondicaoValor] = useState(false)
  const [isDeletingModalBancadaTpPagtoCondicaoValor, setIsDeletingModalBancadaTpPagtoCondicaoValor] = useState(false)
  const [isModalBancadaTpPagtoCondicaoValorFormVisible, setIsModalBancadaTpPagtoCondicaoValorFormVisible] = useState(false)
  const [editingModalBancadaTpPagtoCondicaoValorCodigo, setEditingModalBancadaTpPagtoCondicaoValorCodigo] = useState<string | null>(null)
  const [modalBancadaTpPagtoCondicaoValorFormMode, setModalBancadaTpPagtoCondicaoValorFormMode] = useState<FormMode>('create')
  const [modalBancadaTpPagtoCondicaoValorFilterAssociationCodigo, setModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoValorFilterData, setModalBancadaTpPagtoCondicaoValorFilterData] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo, setAppliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoValorFilterData, setAppliedModalBancadaTpPagtoCondicaoValorFilterData] = useState('')
  const [modalBancadaTpPagtoCondicaoValorPage, setModalBancadaTpPagtoCondicaoValorPage] = useState(1)
  const [modalBancadaTpPagtoCondicaoValorTotalItems, setModalBancadaTpPagtoCondicaoValorTotalItems] = useState(0)
  const [modalBancadaTpPagtoCondicaoValorTotalPages, setModalBancadaTpPagtoCondicaoValorTotalPages] = useState(1)
  const [kmValorItems, setKmValorItems] = useState<KmValorItem[]>([])
  const [kmValorCondicaoCodigo, setKmValorCondicaoCodigo] = useState('')
  const [kmValorData, setKmValorData] = useState('')
  const [kmValorValor, setKmValorValor] = useState('')
  const [kmValorStatusMessage, setKmValorStatusMessage] = useState('')
  const [kmValorStatusTone, setKmValorStatusTone] = useState<StatusTone>('idle')
  const [kmValorCondicaoOptions, setKmValorCondicaoOptions] = useState<CondicaoItem[]>([])
  const [isLoadingKmValorOptions, setIsLoadingKmValorOptions] = useState(false)
  const [isLoadingKmValorItems, setIsLoadingKmValorItems] = useState(false)
  const [isSavingKmValor, setIsSavingKmValor] = useState(false)
  const [isDeletingKmValor, setIsDeletingKmValor] = useState(false)
  const [isKmValorFormVisible, setIsKmValorFormVisible] = useState(false)
  const [editingKmValorCodigo, setEditingKmValorCodigo] = useState<string | null>(null)
  const [kmValorFormMode, setKmValorFormMode] = useState<FormMode>('create')
  const [kmValorFilterCondicaoCodigo, setKmValorFilterCondicaoCodigo] = useState('')
  const [kmValorFilterData, setKmValorFilterData] = useState('')
  const [appliedKmValorFilterCondicaoCodigo, setAppliedKmValorFilterCondicaoCodigo] = useState('')
  const [appliedKmValorFilterData, setAppliedKmValorFilterData] = useState('')
  const [kmValorPage, setKmValorPage] = useState(1)
  const [kmValorTotalItems, setKmValorTotalItems] = useState(0)
  const [kmValorTotalPages, setKmValorTotalPages] = useState(1)
  const [continuaValorItems, setContinuaValorItems] = useState<ContinuaValorItem[]>([])
  const [continuaValorTipo, setContinuaValorTipo] = useState<ContinuaValorTipo | ''>('')
  const [continuaValorData, setContinuaValorData] = useState('')
  const [continuaValorValor, setContinuaValorValor] = useState('')
  const [continuaValorStatusMessage, setContinuaValorStatusMessage] = useState('')
  const [continuaValorStatusTone, setContinuaValorStatusTone] = useState<StatusTone>('idle')
  const [isLoadingContinuaValorItems, setIsLoadingContinuaValorItems] = useState(false)
  const [isSavingContinuaValor, setIsSavingContinuaValor] = useState(false)
  const [isDeletingContinuaValor, setIsDeletingContinuaValor] = useState(false)
  const [isContinuaValorFormVisible, setIsContinuaValorFormVisible] = useState(false)
  const [editingContinuaValorCodigo, setEditingContinuaValorCodigo] = useState<string | null>(null)
  const [continuaValorFormMode, setContinuaValorFormMode] = useState<FormMode>('create')
  const [continuaValorFilterTipo, setContinuaValorFilterTipo] = useState<ContinuaValorTipo | ''>('')
  const [continuaValorFilterData, setContinuaValorFilterData] = useState('')
  const [appliedContinuaValorFilterTipo, setAppliedContinuaValorFilterTipo] = useState<ContinuaValorTipo | ''>('')
  const [appliedContinuaValorFilterData, setAppliedContinuaValorFilterData] = useState('')
  const [continuaValorPage, setContinuaValorPage] = useState(1)
  const [continuaValorTotalItems, setContinuaValorTotalItems] = useState(0)
  const [continuaValorTotalPages, setContinuaValorTotalPages] = useState(1)
  const [parametroVeiculoItems, setParametroVeiculoItems] = useState<ParametroVeiculoItem[]>([])
  const [parametroVeiculoModalidadeTipoBancadaCodigo, setParametroVeiculoModalidadeTipoBancadaCodigo] = useState('')
  const [parametroVeiculoCondicao, setParametroVeiculoCondicao] = useState('')
  const [parametroVeiculoQtdeCondicao, setParametroVeiculoQtdeCondicao] = useState('')
  const [parametroVeiculoData, setParametroVeiculoData] = useState('')
  const [parametroVeiculoStatusMessage, setParametroVeiculoStatusMessage] = useState('')
  const [parametroVeiculoStatusTone, setParametroVeiculoStatusTone] = useState<StatusTone>('idle')
  const [parametroVeiculoAssociationOptions, setParametroVeiculoAssociationOptions] = useState<ModalidadeTipoBancadaAssociationItem[]>([])
  const [isLoadingParametroVeiculoOptions, setIsLoadingParametroVeiculoOptions] = useState(false)
  const [isLoadingParametroVeiculoItems, setIsLoadingParametroVeiculoItems] = useState(false)
  const [isSavingParametroVeiculo, setIsSavingParametroVeiculo] = useState(false)
  const [isDeletingParametroVeiculo, setIsDeletingParametroVeiculo] = useState(false)
  const [isParametroVeiculoFormVisible, setIsParametroVeiculoFormVisible] = useState(false)
  const [editingParametroVeiculoCodigo, setEditingParametroVeiculoCodigo] = useState<string | null>(null)
  const [parametroVeiculoFormMode, setParametroVeiculoFormMode] = useState<FormMode>('create')
  const [parametroVeiculoFilterModalidadeTipoBancadaCodigo, setParametroVeiculoFilterModalidadeTipoBancadaCodigo] = useState('')
  const [parametroVeiculoFilterCondicao, setParametroVeiculoFilterCondicao] = useState('')
  const [parametroVeiculoFilterData, setParametroVeiculoFilterData] = useState('')
  const [appliedParametroVeiculoFilterModalidadeTipoBancadaCodigo, setAppliedParametroVeiculoFilterModalidadeTipoBancadaCodigo] = useState('')
  const [appliedParametroVeiculoFilterCondicao, setAppliedParametroVeiculoFilterCondicao] = useState('')
  const [appliedParametroVeiculoFilterData, setAppliedParametroVeiculoFilterData] = useState('')
  const [parametroVeiculoPage, setParametroVeiculoPage] = useState(1)
  const [parametroVeiculoTotalItems, setParametroVeiculoTotalItems] = useState(0)
  const [parametroVeiculoTotalPages, setParametroVeiculoTotalPages] = useState(1)
  const [titularItems, setTitularItems] = useState<TitularItem[]>([])
  const [titularCnpjCpf, setTitularCnpjCpf] = useState('')
  const [titularNome, setTitularNome] = useState('')
  const [titularCnpjCpfError, setTitularCnpjCpfError] = useState('')
  const [titularNomeError, setTitularNomeError] = useState('')
  const [titularStatusMessage, setTitularStatusMessage] = useState('')
  const [titularStatusTone, setTitularStatusTone] = useState<StatusTone>('idle')
  const [isLoadingTitular, setIsLoadingTitular] = useState(false)
  const [isSavingTitular, setIsSavingTitular] = useState(false)
  const [isDeletingTitular, setIsDeletingTitular] = useState(false)
  const [isTitularFormVisible, setIsTitularFormVisible] = useState(false)
  const [editingTitularCodigo, setEditingTitularCodigo] = useState<string | null>(null)
  const [titularFormMode, setTitularFormMode] = useState<FormMode>('create')
  const [titularSearch, setTitularSearch] = useState('')
  const [titularPage, setTitularPage] = useState(1)
  const [titularTotalItems, setTitularTotalItems] = useState(0)
  const [titularTotalPages, setTitularTotalPages] = useState(1)
  const [titularSortBy, setTitularSortBy] = useState<TitularSortField>('codigo')
  const [titularSortDirection, setTitularSortDirection] = useState<DreSortDirection>('asc')
  const deferredTitularSearch = useDeferredValue(titularSearch)
  const [marcaModeloItems, setMarcaModeloItems] = useState<MarcaModeloItem[]>([])
  const [marcaModeloDescricao, setMarcaModeloDescricao] = useState('')
  const [marcaModeloDescricaoError, setMarcaModeloDescricaoError] = useState('')
  const [marcaModeloStatusMessage, setMarcaModeloStatusMessage] = useState('')
  const [marcaModeloStatusTone, setMarcaModeloStatusTone] = useState<StatusTone>('idle')
  const [isLoadingMarcaModelo, setIsLoadingMarcaModelo] = useState(false)
  const [isSavingMarcaModelo, setIsSavingMarcaModelo] = useState(false)
  const [isDeletingMarcaModelo, setIsDeletingMarcaModelo] = useState(false)
  const [isMarcaModeloFormVisible, setIsMarcaModeloFormVisible] = useState(false)
  const [editingMarcaModeloCodigo, setEditingMarcaModeloCodigo] = useState<string | null>(null)
  const [marcaModeloFormMode, setMarcaModeloFormMode] = useState<FormMode>('create')
  const [marcaModeloSearch, setMarcaModeloSearch] = useState('')
  const [marcaModeloPage, setMarcaModeloPage] = useState(1)
  const [marcaModeloTotalItems, setMarcaModeloTotalItems] = useState(0)
  const [marcaModeloTotalPages, setMarcaModeloTotalPages] = useState(1)
  const [marcaModeloSortBy, setMarcaModeloSortBy] = useState<MarcaModeloSortField>('codigo')
  const [marcaModeloSortDirection, setMarcaModeloSortDirection] = useState<DreSortDirection>('asc')
  const deferredMarcaModeloSearch = useDeferredValue(marcaModeloSearch)
  const [seguradoraItems, setSeguradoraItems] = useState<SeguradoraItem[]>([])
  const [seguradoraControle, setSeguradoraControle] = useState('')
  const [seguradoraLista, setSeguradoraLista] = useState('')
  const [seguradoraControleError, setSeguradoraControleError] = useState('')
  const [seguradoraListaError, setSeguradoraListaError] = useState('')
  const [seguradoraStatusMessage, setSeguradoraStatusMessage] = useState('')
  const [seguradoraStatusTone, setSeguradoraStatusTone] = useState<StatusTone>('idle')
  const [isLoadingSeguradora, setIsLoadingSeguradora] = useState(false)
  const [isSavingSeguradora, setIsSavingSeguradora] = useState(false)
  const [isDeletingSeguradora, setIsDeletingSeguradora] = useState(false)
  const [isSeguradoraFormVisible, setIsSeguradoraFormVisible] = useState(false)
  const [editingSeguradoraCodigo, setEditingSeguradoraCodigo] = useState<string | null>(null)
  const [seguradoraFormMode, setSeguradoraFormMode] = useState<FormMode>('create')
  const [seguradoraSearch, setSeguradoraSearch] = useState('')
  const [seguradoraPage, setSeguradoraPage] = useState(1)
  const [seguradoraTotalItems, setSeguradoraTotalItems] = useState(0)
  const [seguradoraTotalPages, setSeguradoraTotalPages] = useState(1)
  const [seguradoraSortBy, setSeguradoraSortBy] = useState<SeguradoraSortField>('codigo')
  const [seguradoraSortDirection, setSeguradoraSortDirection] = useState<DreSortDirection>('asc')
  const deferredSeguradoraSearch = useDeferredValue(seguradoraSearch)
  const deferredDashboardDrillDownSearch = useDeferredValue(dashboardDrillDownSearch)

  useEffect(() => {
    setSession(getStoredSession())
  }, [])

  const clearSidebarAutoHideTimeout = useCallback(() => {
    if (sidebarAutoHideTimeoutRef.current !== null) {
      window.clearTimeout(sidebarAutoHideTimeoutRef.current)
      sidebarAutoHideTimeoutRef.current = null
    }
  }, [])

  const scheduleSidebarAutoHide = useCallback(() => {
    clearSidebarAutoHideTimeout()

    if (typeof window === 'undefined') {
      return
    }

    const canAutoHideSidebar = window.matchMedia('(hover: hover) and (pointer: fine)').matches

    if (!canAutoHideSidebar || isSidebarHoveredRef.current) {
      return
    }

    sidebarAutoHideTimeoutRef.current = window.setTimeout(() => {
      if (!isSidebarHoveredRef.current) {
        setIsSidebarVisible(false)
      }
    }, SIDEBAR_AUTO_HIDE_DELAY_MS)
  }, [clearSidebarAutoHideTimeout])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const canAutoHideSidebar = window.matchMedia('(hover: hover) and (pointer: fine)').matches

    if (!canAutoHideSidebar) {
      clearSidebarAutoHideTimeout()
      setIsSidebarVisible(true)
      return undefined
    }

    if (!isSidebarVisible) {
      clearSidebarAutoHideTimeout()
      return undefined
    }

    const handleInteraction = () => {
      if (!isSidebarHoveredRef.current) {
        scheduleSidebarAutoHide()
      }
    }

    scheduleSidebarAutoHide()

    window.addEventListener('mousemove', handleInteraction)
    window.addEventListener('mousedown', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    window.addEventListener('scroll', handleInteraction)

    return () => {
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('mousedown', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('scroll', handleInteraction)
      clearSidebarAutoHideTimeout()
    }
  }, [clearSidebarAutoHideTimeout, isSidebarVisible, scheduleSidebarAutoHide])

  const loadDashboardAtivos = useCallback(async (monthToLoad: string) => {
    setIsLoadingDashboard(true)
    setDashboardStatusTone('idle')
    setDashboardStatusMessage('Carregando painel mensal de OrdemServico...')
    setTermoAtivosCount(0)
    setTermoRescindidosCount(0)
    setOsCanceladasCount(0)
    setIsDashboardDrillDownVisible(false)
    setDashboardDrillDownContext(null)
    setDashboardDrillDownData(null)
    setDashboardDrillDownSearch('')
    setDashboardDrillDownStatusMessage('')
    setIsDashboardOsPopupVisible(false)
    setDashboardOsPopupUrl('')

    try {
      const [result, bancadaResult, termoAtivos, termoRescindidos, osCanceladas] = await Promise.all([
        getOrdemServicoDashboardAtivos(monthToLoad),
        getOrdemServicoDashboardAtivosBancada(monthToLoad),
        getTermoCountByStatus('ATIVO').catch(() => 0),
        getTermoCountByStatus('RESCINDIDO').catch(() => 0),
        getOrdemServicoCountBySituacao('Cancelado').catch(() => 0),
      ])

      setDashboardData(result)
      setDashboardBancadaData(bancadaResult)
      setTermoAtivosCount(termoAtivos)
      setTermoRescindidosCount(termoRescindidos)
      setOsCanceladasCount(osCanceladas)
      setDashboardStatusMessage(result.rows.length ? '' : 'Nenhuma OrdemServico esteve ativa no mes selecionado.')
      setDashboardStatusTone('idle')
    } catch (error) {
      setDashboardData(null)
      setDashboardBancadaData(null)
      setDashboardStatusTone('error')
      setDashboardStatusMessage(error instanceof Error ? error.message : 'Falha ao carregar o dashboard de OrdemServico.')
    } finally {
      setIsLoadingDashboard(false)
    }
  }, [])

  const handleCloseDashboardDrillDown = () => {
    setIsDashboardDrillDownVisible(false)
    setIsLoadingDashboardDrillDown(false)
    setDashboardDrillDownContext(null)
    setDashboardDrillDownData(null)
    setDashboardDrillDownSearch('')
    setDashboardDrillDownStatusMessage('')
  }

  const handleCloseDashboardOsPopup = () => {
    setIsDashboardOsPopupVisible(false)
    setDashboardOsPopupUrl('')
  }

  const openDashboardTab = (relativePath: string) => {
    const url = `${window.location.origin}${relativePath}`
    window.open(url, '_blank')
  }

  const handleOpenTermosGrid = () => openDashboardTab('/src/credenciamentoTermo.html')
  const handleOpenOrdemServicoGrid = () => openDashboardTab('/src/ordemServico.html')

  useEffect(() => {
    const handleDashboardOsPopupMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (!event.data || typeof event.data !== 'object') {
        return
      }

      if ((event.data as { type?: string }).type !== 'teg-dashboard-close-os-popup') {
        return
      }

      handleCloseDashboardOsPopup()
    }

    window.addEventListener('message', handleDashboardOsPopupMessage)

    return () => {
      window.removeEventListener('message', handleDashboardOsPopupMessage)
    }
  }, [])

  useEffect(() => {
    if (!session || activeView !== 'inicio' || (dashboardData && dashboardBancadaData)) {
      return
    }

    void loadDashboardAtivos(dashboardMonth)
  }, [activeView, dashboardBancadaData, dashboardData, dashboardMonth, loadDashboardAtivos, session])

  const loadDreItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingDre(true)
    setDreStatusMessage('Carregando registros da DRE...')
    setDreStatusTone('idle')

    try {
      const result = await listDreItemsPaginated({
        search: deferredDreSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: dreSortBy,
        sortDirection: dreSortDirection,
      })

      setDreItems(result.items)
      setDreTotalItems(result.total)
      setDreTotalPages(result.totalPages)
      setDrePage(result.page)
      setDreSortBy(result.sortBy)
      setDreSortDirection(result.sortDirection)
      setDreStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela DRE.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros da DRE.'

      setDreStatusTone('error')
      setDreStatusMessage(message)
    } finally {
      setIsLoadingDre(false)
    }
  }, [deferredDreSearch, dreSortBy, dreSortDirection])

  const loadModalidadeItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingModalidade(true)
    setModalidadeStatusMessage('Carregando registros de modalidade...')
    setModalidadeStatusTone('idle')

    try {
      const result = await listModalidadeItemsPaginated({
        search: deferredModalidadeSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: modalidadeSortBy,
        sortDirection: modalidadeSortDirection,
      })

      setModalidadeItems(result.items)
      setModalidadeTotalItems(result.total)
      setModalidadeTotalPages(result.totalPages)
      setModalidadePage(result.page)
      setModalidadeSortBy(result.sortBy)
      setModalidadeSortDirection(result.sortDirection)
      setModalidadeStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Modalidade.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de modalidade.'

      setModalidadeStatusTone('error')
      setModalidadeStatusMessage(message)
    } finally {
      setIsLoadingModalidade(false)
    }
  }, [deferredModalidadeSearch, modalidadeSortBy, modalidadeSortDirection])

  const loadCondicaoItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingCondicao(true)
    setCondicaoStatusMessage('Carregando registros de condicao...')
    setCondicaoStatusTone('idle')

    try {
      const result = await listCondicaoItemsPaginated({
        search: deferredCondicaoSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: condicaoSortBy,
        sortDirection: condicaoSortDirection,
      })

      const normalizedCondicaoItems = result.sortBy === 'codigo'
        ? [...result.items].sort((left, right) => {
            const leftCodigo = Number(left.codigo)
            const rightCodigo = Number(right.codigo)

            if (!Number.isNaN(leftCodigo) && !Number.isNaN(rightCodigo)) {
              return result.sortDirection === 'asc'
                ? leftCodigo - rightCodigo
                : rightCodigo - leftCodigo
            }

            return result.sortDirection === 'asc'
              ? left.codigo.localeCompare(right.codigo, 'pt-BR', { numeric: true })
              : right.codigo.localeCompare(left.codigo, 'pt-BR', { numeric: true })
          })
        : result.items

      setCondicaoItems(normalizedCondicaoItems)
      setCondicaoTotalItems(result.total)
      setCondicaoTotalPages(result.totalPages)
      setCondicaoPage(result.page)
      setCondicaoSortBy(result.sortBy)
      setCondicaoSortDirection(result.sortDirection)
      setCondicaoStatusMessage(normalizedCondicaoItems.length ? '' : 'Nenhum registro encontrado na tabela Condicao.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de condicao.'

      setCondicaoStatusTone('error')
      setCondicaoStatusMessage(message)
    } finally {
      setIsLoadingCondicao(false)
    }
  }, [condicaoSortBy, condicaoSortDirection, deferredCondicaoSearch])

  const loadTipoBancadaItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingTipoBancada(true)
    setTipoBancadaStatusMessage('Carregando registros de tipo de bancada...')
    setTipoBancadaStatusTone('idle')

    try {
      const result = await listTipoBancadaItemsPaginated({
        search: deferredTipoBancadaSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: tipoBancadaSortBy,
        sortDirection: tipoBancadaSortDirection,
      })

      setTipoBancadaItems(result.items)
      setTipoBancadaTotalItems(result.total)
      setTipoBancadaTotalPages(result.totalPages)
      setTipoBancadaPage(result.page)
      setTipoBancadaSortBy(result.sortBy)
      setTipoBancadaSortDirection(result.sortDirection)
      setTipoBancadaStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Tipo de Bancada.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de tipo de bancada.'

      setTipoBancadaStatusTone('error')
      setTipoBancadaStatusMessage(message)
    } finally {
      setIsLoadingTipoBancada(false)
    }
  }, [deferredTipoBancadaSearch, tipoBancadaSortBy, tipoBancadaSortDirection])

  const loadTipoPgtoItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingTipoPgto(true)
    setTipoPgtoStatusMessage('Carregando registros de tipo de pagamento...')
    setTipoPgtoStatusTone('idle')

    try {
      const result = await listTipoPgtoItemsPaginated({
        search: deferredTipoPgtoSearch,
        page: pageToLoad,
        pageSize: 20,
        sortBy: tipoPgtoSortBy,
        sortDirection: tipoPgtoSortDirection,
      })

      setTipoPgtoItems(result.items)
      setTipoPgtoTotalItems(result.total)
      setTipoPgtoTotalPages(result.totalPages)
      setTipoPgtoPage(result.page)
      setTipoPgtoSortBy(result.sortBy)
      setTipoPgtoSortDirection(result.sortDirection)
      setTipoPgtoStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Tipo_pgto.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de tipo de pagamento.'

      setTipoPgtoStatusTone('error')
      setTipoPgtoStatusMessage(message)
    } finally {
      setIsLoadingTipoPgto(false)
    }
  }, [deferredTipoPgtoSearch, tipoPgtoSortBy, tipoPgtoSortDirection])

  const loadAssociationOptions = useCallback(async () => {
    setIsLoadingAssociationOptions(true)
    setAssociationStatusTone('idle')
    setAssociationStatusMessage('Carregando opções de modalidade e tipo de bancada...')

    try {
      const [modalidadeResult, tipoBancadaResult] = await Promise.all([
        listModalidadeItemsPaginated({
          page: 1,
          pageSize: 500,
          sortBy: 'descricao',
          sortDirection: 'asc',
        }),
        listTipoBancadaItemsPaginated({
          page: 1,
          pageSize: 500,
          sortBy: 'descricao',
          sortDirection: 'asc',
        }),
      ])

      setAssociationModalidadeOptions(modalidadeResult.items)
      setAssociationTipoBancadaOptions(tipoBancadaResult.items)
      setAssociationStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opções de associação.'

      setAssociationStatusTone('error')
      setAssociationStatusMessage(message)
    } finally {
      setIsLoadingAssociationOptions(false)
    }
  }, [])

  const loadTipoBancadaAssociationItems = useCallback(async () => {
    setIsLoadingTipoBancadaAssociations(true)

    try {
      const items = await listModalidadeTipoBancadaAssociationItems()
      setTipoBancadaAssociationItems(items)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as associacoes de modalidade x tipo de bancada.'

      setAssociationStatusTone('error')
      setAssociationStatusMessage(message)
    } finally {
      setIsLoadingTipoBancadaAssociations(false)
    }
  }, [])

  const handleAddTipoBancadaAssociation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setAssociationStatusTone('idle')
    setAssociationStatusMessage('')

    if (!associationModalidadeCodigo || !associationTipoBancadaCodigo) {
      setAssociationStatusTone('error')
      setAssociationStatusMessage('Selecione Modalidade e Tipo de Bancada.')
      return
    }

    const modalidade = associationModalidadeOptions.find((item) => item.codigo === associationModalidadeCodigo)
    const tipoBancada = associationTipoBancadaOptions.find((item) => item.codigo === associationTipoBancadaCodigo)

    if (!modalidade || !tipoBancada) {
      setAssociationStatusTone('error')
      setAssociationStatusMessage('Selecao invalida.')
      return
    }

    setIsSavingTipoBancadaAssociation(true)

    try {
      await createModalidadeTipoBancadaAssociationItem({
        modalidadeCodigo: modalidade.codigo,
        tipoBancadaCodigo: tipoBancada.codigo,
      })

      setAssociationModalidadeCodigo('')
      setAssociationTipoBancadaCodigo('')
      setAssociationStatusTone('success')
      setAssociationStatusMessage('Associacao criada com sucesso.')
      await loadTipoBancadaAssociationItems()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao criar a associacao.'

      setAssociationStatusTone('error')
      setAssociationStatusMessage(message)
    } finally {
      setIsSavingTipoBancadaAssociation(false)
    }
  }

  const handleDeleteTipoBancadaAssociation = async (item: ModalidadeTipoBancadaAssociationItem) => {
    const confirmed = window.confirm(`Excluir a associacao ${item.modalidadeDescricao} x ${item.tipoBancadaDescricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTipoBancadaAssociation(true)

    try {
      await deleteModalidadeTipoBancadaAssociationItem(item.codigo)
      setAssociationStatusTone('success')
      setAssociationStatusMessage('Associacao removida.')
      await loadTipoBancadaAssociationItems()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir a associacao.'

      setAssociationStatusTone('error')
      setAssociationStatusMessage(message)
    } finally {
      setIsDeletingTipoBancadaAssociation(false)
    }
  }

  const loadModalBancadaTpPagtoCondicaoOptions = useCallback(async () => {
    setIsLoadingModalBancadaTpPagtoCondicaoOptions(true)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('Carregando opcoes de Modalidade x Tipo de Bancada, Tipo de Pagamento e Condicao...')

    try {
      const [associationItems, tipoPgtoResult, condicaoResult] = await Promise.all([
        listModalidadeTipoBancadaAssociationItems(),
        listTipoPgtoItemsPaginated({
          page: 1,
          pageSize: 500,
          sortBy: 'codigo',
          sortDirection: 'asc',
        }),
        listCondicaoItemsPaginated({
          page: 1,
          pageSize: 500,
          sortBy: 'codigo',
          sortDirection: 'asc',
        }),
      ])

      setModalBancadaTpPagtoCondicaoAssociationOptions(associationItems)
      setModalBancadaTpPagtoCondicaoTipoPgtoOptions(tipoPgtoResult.items)
      setModalBancadaTpPagtoCondicaoCondicaoOptions(condicaoResult.items)
      setModalBancadaTpPagtoCondicaoStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opcoes da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage(message)
    } finally {
      setIsLoadingModalBancadaTpPagtoCondicaoOptions(false)
    }
  }, [])

  const loadModalBancadaTpPagtoCondicaoItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingModalBancadaTpPagtoCondicaoItems(true)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('Carregando registros da associacao de modalidade, bancada, pagamento e condicao...')

    try {
      const result = await listModalBancadaTpPagtoCondicaoItems({
        modalidadeTipoBancadaCodigo: appliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo,
        tipoPgtoCodigo: appliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo,
        condicaoCodigo: appliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })
      setModalBancadaTpPagtoCondicaoItems(result.items)
      setModalBancadaTpPagtoCondicaoTotalItems(result.total)
      setModalBancadaTpPagtoCondicaoTotalPages(result.totalPages)
      setModalBancadaTpPagtoCondicaoPage(result.page)
      setModalBancadaTpPagtoCondicaoStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na associacao de modalidade, bancada, pagamento e condicao.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage(message)
    } finally {
      setIsLoadingModalBancadaTpPagtoCondicaoItems(false)
    }
  }, [
    appliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo,
    appliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo,
    appliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo,
  ])

  const loadModalBancadaTpPagtoCondicaoValorOptions = useCallback(async () => {
    setIsLoadingModalBancadaTpPagtoCondicaoValorOptions(true)
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('Carregando opcoes da associacao de modalidade, bancada, pagamento e condicao...')

    try {
      const result = await listModalBancadaTpPagtoCondicaoItems({
        page: 1,
        pageSize: 500,
      })

      setModalBancadaTpPagtoCondicaoValorOptions(result.items)
      setModalBancadaTpPagtoCondicaoValorStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opcoes do valor da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(message)
    } finally {
      setIsLoadingModalBancadaTpPagtoCondicaoValorOptions(false)
    }
  }, [])

  const loadModalBancadaTpPagtoCondicaoValorItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingModalBancadaTpPagtoCondicaoValorItems(true)
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('Carregando registros de valor da associacao de modalidade, bancada, pagamento e condicao...')

    try {
      const result = await listModalBancadaTpPagtoCondicaoValorItems({
        modalBancadaTpPagtoCondicaoCodigo: appliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo,
        data: appliedModalBancadaTpPagtoCondicaoValorFilterData,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })

      setModalBancadaTpPagtoCondicaoValorItems(result.items)
      setModalBancadaTpPagtoCondicaoValorTotalItems(result.total)
      setModalBancadaTpPagtoCondicaoValorTotalPages(result.totalPages)
      setModalBancadaTpPagtoCondicaoValorPage(result.page)
      setModalBancadaTpPagtoCondicaoValorStatusMessage(result.items.length ? '' : 'Nenhum registro de valor encontrado.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de valor da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(message)
    } finally {
      setIsLoadingModalBancadaTpPagtoCondicaoValorItems(false)
    }
  }, [
    appliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo,
    appliedModalBancadaTpPagtoCondicaoValorFilterData,
  ])

  const loadKmValorOptions = useCallback(async () => {
    setIsLoadingKmValorOptions(true)
    setKmValorStatusTone('idle')
    setKmValorStatusMessage('Carregando opcoes de condicao...')

    try {
      const result = await listCondicaoItemsPaginated({
        page: 1,
        pageSize: 500,
        sortBy: 'descricao',
        sortDirection: 'asc',
      })

      setKmValorCondicaoOptions(result.items.filter((item) => item.exibirKmValor))
      setKmValorStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opcoes de condicao para km valor.'

      setKmValorStatusTone('error')
      setKmValorStatusMessage(message)
    } finally {
      setIsLoadingKmValorOptions(false)
    }
  }, [])

  const loadKmValorItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingKmValorItems(true)
    setKmValorStatusTone('idle')
    setKmValorStatusMessage('Carregando registros de km valor...')

    try {
      const result = await listKmValorItems({
        condicaoCodigo: appliedKmValorFilterCondicaoCodigo,
        data: appliedKmValorFilterData,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })

      setKmValorItems(result.items)
      setKmValorTotalItems(result.total)
      setKmValorTotalPages(result.totalPages)
      setKmValorPage(result.page)
      setKmValorStatusMessage(result.items.length ? '' : 'Nenhum registro de km valor encontrado.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de km valor.'

      setKmValorStatusTone('error')
      setKmValorStatusMessage(message)
    } finally {
      setIsLoadingKmValorItems(false)
    }
  }, [
    appliedKmValorFilterCondicaoCodigo,
    appliedKmValorFilterData,
  ])

  const loadContinuaValorItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingContinuaValorItems(true)
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage('Carregando registros de continua valor...')

    try {
      const result = await listContinuaValorItems({
        tipoContinua: appliedContinuaValorFilterTipo,
        data: appliedContinuaValorFilterData,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })

      setContinuaValorItems(result.items)
      setContinuaValorTotalItems(result.total)
      setContinuaValorTotalPages(result.totalPages)
      setContinuaValorPage(result.page)
      setContinuaValorStatusMessage(result.items.length ? '' : 'Nenhum registro de continua valor encontrado.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de continua valor.'

      setContinuaValorStatusTone('error')
      setContinuaValorStatusMessage(message)
    } finally {
      setIsLoadingContinuaValorItems(false)
    }
  }, [
    appliedContinuaValorFilterData,
    appliedContinuaValorFilterTipo,
  ])

  const loadParametroVeiculoOptions = useCallback(async () => {
    setIsLoadingParametroVeiculoOptions(true)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('Carregando opcoes de modalidade x tipo de bancada...')

    try {
      const items = await listModalidadeTipoBancadaAssociationItems()
      setParametroVeiculoAssociationOptions(items)
      setParametroVeiculoStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opcoes de modalidade x tipo de bancada para parametro veiculo.'

      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage(message)
    } finally {
      setIsLoadingParametroVeiculoOptions(false)
    }
  }, [])

  const loadParametroVeiculoItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingParametroVeiculoItems(true)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('Carregando registros de parametro veiculo...')

    try {
      const result = await listParametroVeiculoItems({
        modalidadeTipoBancadaCodigo: appliedParametroVeiculoFilterModalidadeTipoBancadaCodigo,
        condicao: appliedParametroVeiculoFilterCondicao,
        data: appliedParametroVeiculoFilterData,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })

      setParametroVeiculoItems(result.items)
      setParametroVeiculoTotalItems(result.total)
      setParametroVeiculoTotalPages(result.totalPages)
      setParametroVeiculoPage(result.page)
      setParametroVeiculoStatusMessage(result.items.length ? '' : 'Nenhum registro de parametro veiculo encontrado.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de parametro veiculo.'

      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage(message)
    } finally {
      setIsLoadingParametroVeiculoItems(false)
    }
  }, [
    appliedParametroVeiculoFilterCondicao,
    appliedParametroVeiculoFilterData,
    appliedParametroVeiculoFilterModalidadeTipoBancadaCodigo,
  ])

  const handleCreateModalBancadaTpPagtoCondicao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (modalBancadaTpPagtoCondicaoFormMode === 'view') {
      setModalBancadaTpPagtoCondicaoStatusTone('idle')
      setModalBancadaTpPagtoCondicaoStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('')

    if (!modalBancadaTpPagtoCondicaoAssociationCodigo || !modalBancadaTpPagtoCondicaoTipoPgtoCodigo || !modalBancadaTpPagtoCondicaoCondicaoCodigo) {
      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage('Selecione Modalidade x Tipo de Bancada, Tipo de Pagamento e Condicao.')
      return
    }

    const association = modalBancadaTpPagtoCondicaoAssociationOptions.find(
      (item) => item.codigo === modalBancadaTpPagtoCondicaoAssociationCodigo,
    )
    const tipoPgto = modalBancadaTpPagtoCondicaoTipoPgtoOptions.find(
      (item) => item.codigo === modalBancadaTpPagtoCondicaoTipoPgtoCodigo,
    )
    const condicao = modalBancadaTpPagtoCondicaoCondicaoOptions.find(
      (item) => item.codigo === modalBancadaTpPagtoCondicaoCondicaoCodigo,
    )

    if (!association || !tipoPgto || !condicao) {
      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage('Selecao invalida.')
      return
    }

    const editingCodigo = editingModalBancadaTpPagtoCondicaoCodigo

    setIsSavingModalBancadaTpPagtoCondicao(true)
    setModalBancadaTpPagtoCondicaoStatusMessage(editingCodigo ? 'Alterando associacao...' : 'Gravando associacao...')

    try {
      await (editingCodigo
        ? updateModalBancadaTpPagtoCondicaoItem(editingCodigo, {
            modalidadeTipoBancadaCodigo: association.codigo,
            tipoPgtoCodigo: tipoPgto.codigo,
            condicaoCodigo: condicao.codigo,
          })
        : createModalBancadaTpPagtoCondicaoItem({
            modalidadeTipoBancadaCodigo: association.codigo,
            tipoPgtoCodigo: tipoPgto.codigo,
            condicaoCodigo: condicao.codigo,
          }))

      resetModalBancadaTpPagtoCondicaoForm()
      setIsModalBancadaTpPagtoCondicaoFormVisible(false)
      setModalBancadaTpPagtoCondicaoStatusTone('success')
      setModalBancadaTpPagtoCondicaoStatusMessage(editingCodigo
        ? 'Registro da associacao de modalidade, bancada, pagamento e condicao alterado com sucesso.'
        : 'Registro da associacao de modalidade, bancada, pagamento e condicao criado com sucesso.')
      await loadModalBancadaTpPagtoCondicaoItems(editingCodigo ? modalBancadaTpPagtoCondicaoPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage(message)
    } finally {
      setIsSavingModalBancadaTpPagtoCondicao(false)
    }
  }

  const handleDeleteModalBancadaTpPagtoCondicao = async (item: ModalBancadaTpPagtoCondicaoItem) => {
    const confirmed = window.confirm(
      `Excluir a associacao ${item.modalidadeDescricao} x ${item.tipoBancadaDescricao} x ${item.tipoPgtoDescricao} x ${item.condicaoDescricao}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingModalBancadaTpPagtoCondicao(true)

    try {
      await deleteModalBancadaTpPagtoCondicaoItem(item.codigo)
      setModalBancadaTpPagtoCondicaoStatusTone('success')
      setModalBancadaTpPagtoCondicaoStatusMessage('Registro da associacao de modalidade, bancada, pagamento e condicao removido.')
      await loadModalBancadaTpPagtoCondicaoItems(modalBancadaTpPagtoCondicaoPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage(message)
    } finally {
      setIsDeletingModalBancadaTpPagtoCondicao(false)
    }
  }

  const handleCreateModalBancadaTpPagtoCondicaoValor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (modalBancadaTpPagtoCondicaoValorFormMode === 'view') {
      setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
      setModalBancadaTpPagtoCondicaoValorStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('')

    if (!modalBancadaTpPagtoCondicaoValorAssociationCodigo || !modalBancadaTpPagtoCondicaoValorData || modalBancadaTpPagtoCondicaoValorValor.trim() === '') {
      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage('Selecione a associacao e informe data e valor.')
      return
    }

    const editingCodigo = editingModalBancadaTpPagtoCondicaoValorCodigo

    setIsSavingModalBancadaTpPagtoCondicaoValor(true)
    setModalBancadaTpPagtoCondicaoValorStatusMessage(editingCodigo ? 'Alterando registro de valor...' : 'Gravando registro de valor...')

    try {
      await (editingCodigo
        ? updateModalBancadaTpPagtoCondicaoValorItem(editingCodigo, {
            modalBancadaTpPagtoCondicaoCodigo: modalBancadaTpPagtoCondicaoValorAssociationCodigo,
            data: modalBancadaTpPagtoCondicaoValorData,
            valor: modalBancadaTpPagtoCondicaoValorValor,
          })
        : createModalBancadaTpPagtoCondicaoValorItem({
            modalBancadaTpPagtoCondicaoCodigo: modalBancadaTpPagtoCondicaoValorAssociationCodigo,
            data: modalBancadaTpPagtoCondicaoValorData,
            valor: modalBancadaTpPagtoCondicaoValorValor,
          }))

      resetModalBancadaTpPagtoCondicaoValorForm()
      setIsModalBancadaTpPagtoCondicaoValorFormVisible(false)
      setModalBancadaTpPagtoCondicaoValorStatusTone('success')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(editingCodigo
        ? 'Registro de valor alterado com sucesso.'
        : 'Registro de valor criado com sucesso.')
      await loadModalBancadaTpPagtoCondicaoValorItems(editingCodigo ? modalBancadaTpPagtoCondicaoValorPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro de valor da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(message)
    } finally {
      setIsSavingModalBancadaTpPagtoCondicaoValor(false)
    }
  }

  const handleDeleteModalBancadaTpPagtoCondicaoValor = async (item: ModalBancadaTpPagtoCondicaoValorItem) => {
    const confirmed = window.confirm(
      `Excluir o valor ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)} da data ${item.data}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingModalBancadaTpPagtoCondicaoValor(true)

    try {
      await deleteModalBancadaTpPagtoCondicaoValorItem(item.codigo)
      setModalBancadaTpPagtoCondicaoValorStatusTone('success')
      setModalBancadaTpPagtoCondicaoValorStatusMessage('Registro de valor removido.')
      await loadModalBancadaTpPagtoCondicaoValorItems(modalBancadaTpPagtoCondicaoValorPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro de valor.'

      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(message)
    } finally {
      setIsDeletingModalBancadaTpPagtoCondicaoValor(false)
    }
  }

  const handleCreateKmValor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (kmValorFormMode === 'view') {
      setKmValorStatusTone('idle')
      setKmValorStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setKmValorStatusTone('idle')
    setKmValorStatusMessage('')

    const normalizedKmValor = normalizeCurrencyInput(kmValorValor)

    if (!kmValorCondicaoCodigo || !kmValorData || !normalizedKmValor) {
      setKmValorStatusTone('error')
      setKmValorStatusMessage('Selecione a condicao e informe data e valor.')
      return
    }

    const editingCodigo = editingKmValorCodigo

    setIsSavingKmValor(true)
    setKmValorStatusMessage(editingCodigo ? 'Alterando registro de km valor...' : 'Gravando registro de km valor...')

    try {
      await (editingCodigo
        ? updateKmValorItem(editingCodigo, {
            condicaoCodigo: kmValorCondicaoCodigo,
            data: kmValorData,
            valor: normalizedKmValor,
          })
        : createKmValorItem({
            condicaoCodigo: kmValorCondicaoCodigo,
            data: kmValorData,
            valor: normalizedKmValor,
          }))

      resetKmValorForm()
      setIsKmValorFormVisible(false)
      setKmValorStatusTone('success')
      setKmValorStatusMessage(editingCodigo
        ? 'Registro de km valor alterado com sucesso.'
        : 'Registro de km valor criado com sucesso.')
      await loadKmValorItems(editingCodigo ? kmValorPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro de km valor.'

      setKmValorStatusTone('error')
      setKmValorStatusMessage(message)
    } finally {
      setIsSavingKmValor(false)
    }
  }

  const handleDeleteKmValor = async (item: KmValorItem) => {
    const confirmed = window.confirm(
      `Excluir o km valor ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)} da data ${item.data} para a condicao ${item.condicaoDescricao}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingKmValor(true)

    try {
      await deleteKmValorItem(item.codigo)
      setKmValorStatusTone('success')
      setKmValorStatusMessage('Registro de km valor removido.')
      await loadKmValorItems(kmValorPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro de km valor.'

      setKmValorStatusTone('error')
      setKmValorStatusMessage(message)
    } finally {
      setIsDeletingKmValor(false)
    }
  }

  const handleCreateContinuaValor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (continuaValorFormMode === 'view') {
      setContinuaValorStatusTone('idle')
      setContinuaValorStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage('')

    const normalizedContinuaValor = normalizeCurrencyInput(continuaValorValor)

    if (!continuaValorTipo || !continuaValorData || !normalizedContinuaValor) {
      setContinuaValorStatusTone('error')
      setContinuaValorStatusMessage('Selecione o tipo continua e informe data e valor.')
      return
    }

    const editingCodigo = editingContinuaValorCodigo

    setIsSavingContinuaValor(true)
    setContinuaValorStatusMessage(editingCodigo ? 'Alterando registro de continua valor...' : 'Gravando registro de continua valor...')

    try {
      await (editingCodigo
        ? updateContinuaValorItem(editingCodigo, {
            tipoContinua: continuaValorTipo,
            data: continuaValorData,
            valor: normalizedContinuaValor,
          })
        : createContinuaValorItem({
            tipoContinua: continuaValorTipo,
            data: continuaValorData,
            valor: normalizedContinuaValor,
          }))

      resetContinuaValorForm()
      setIsContinuaValorFormVisible(false)
      setContinuaValorStatusTone('success')
      setContinuaValorStatusMessage(editingCodigo
        ? 'Registro de continua valor alterado com sucesso.'
        : 'Registro de continua valor criado com sucesso.')
      await loadContinuaValorItems(editingCodigo ? continuaValorPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro de continua valor.'

      setContinuaValorStatusTone('error')
      setContinuaValorStatusMessage(message)
    } finally {
      setIsSavingContinuaValor(false)
    }
  }

  const handleDeleteContinuaValor = async (item: ContinuaValorItem) => {
    const confirmed = window.confirm(
      `Excluir o continua valor ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)} da data ${item.data} para o tipo ${item.tipoContinua}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingContinuaValor(true)

    try {
      await deleteContinuaValorItem(item.codigo)
      setContinuaValorStatusTone('success')
      setContinuaValorStatusMessage('Registro de continua valor removido.')
      await loadContinuaValorItems(continuaValorPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro de continua valor.'

      setContinuaValorStatusTone('error')
      setContinuaValorStatusMessage(message)
    } finally {
      setIsDeletingContinuaValor(false)
    }
  }

  const handleCreateParametroVeiculo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (parametroVeiculoFormMode === 'view') {
      setParametroVeiculoStatusTone('idle')
      setParametroVeiculoStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('')

    if (!parametroVeiculoModalidadeTipoBancadaCodigo || !parametroVeiculoCondicao.trim() || !parametroVeiculoQtdeCondicao.trim() || !parametroVeiculoData) {
      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage('Informe modalidade x tipo de bancada, condicao, qtde da condicao e data.')
      return
    }

    if (!PARAMETRO_VEICULO_CONDICAO_OPTIONS.includes(parametroVeiculoCondicao as (typeof PARAMETRO_VEICULO_CONDICAO_OPTIONS)[number])) {
      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage('Selecione uma condicao valida.')
      return
    }

    const qtdeCondicao = Number(parametroVeiculoQtdeCondicao)

    if (!Number.isInteger(qtdeCondicao) || qtdeCondicao < 0) {
      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage('Qtde da condicao deve ser um numero inteiro maior ou igual a zero.')
      return
    }

    const editingCodigo = editingParametroVeiculoCodigo

    setIsSavingParametroVeiculo(true)
    setParametroVeiculoStatusMessage(editingCodigo ? 'Alterando registro de parametro veiculo...' : 'Gravando registro de parametro veiculo...')

    try {
      await (editingCodigo
        ? updateParametroVeiculoItem(editingCodigo, {
            modalidadeTipoBancadaCodigo: parametroVeiculoModalidadeTipoBancadaCodigo,
            condicao: parametroVeiculoCondicao,
            qtdeCondicao: String(qtdeCondicao),
            data: parametroVeiculoData,
          })
        : createParametroVeiculoItem({
            modalidadeTipoBancadaCodigo: parametroVeiculoModalidadeTipoBancadaCodigo,
            condicao: parametroVeiculoCondicao,
            qtdeCondicao: String(qtdeCondicao),
            data: parametroVeiculoData,
          }))

      resetParametroVeiculoForm()
      setIsParametroVeiculoFormVisible(false)
      setParametroVeiculoStatusTone('success')
      setParametroVeiculoStatusMessage(editingCodigo
        ? 'Registro de parametro veiculo alterado com sucesso.'
        : 'Registro de parametro veiculo criado com sucesso.')
      await loadParametroVeiculoItems(editingCodigo ? parametroVeiculoPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro de parametro veiculo.'

      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage(message)
    } finally {
      setIsSavingParametroVeiculo(false)
    }
  }

  const handleDeleteParametroVeiculo = async (item: ParametroVeiculoItem) => {
    const confirmed = window.confirm(
      `Excluir o parametro veiculo ${formatModalidadeTipoBancadaLabel(item)} / ${item.condicao} / ${item.data}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingParametroVeiculo(true)

    try {
      await deleteParametroVeiculoItem(item.codigo)
      setParametroVeiculoStatusTone('success')
      setParametroVeiculoStatusMessage('Registro de parametro veiculo removido.')
      await loadParametroVeiculoItems(parametroVeiculoPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro de parametro veiculo.'

      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage(message)
    } finally {
      setIsDeletingParametroVeiculo(false)
    }
  }

  const loadSeguradoraItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingSeguradora(true)
    setSeguradoraStatusMessage('Carregando registros de seguradoras...')
    setSeguradoraStatusTone('idle')

    try {
      const result = await listSeguradoraItemsPaginated({
        search: deferredSeguradoraSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: seguradoraSortBy,
        sortDirection: seguradoraSortDirection,
      })

      setSeguradoraItems(result.items)
      setSeguradoraTotalItems(result.total)
      setSeguradoraTotalPages(result.totalPages)
      setSeguradoraPage(result.page)
      setSeguradoraSortBy(result.sortBy)
      setSeguradoraSortDirection(result.sortDirection)
      setSeguradoraStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela seguradora.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de seguradoras.'

      setSeguradoraStatusTone('error')
      setSeguradoraStatusMessage(message)
    } finally {
      setIsLoadingSeguradora(false)
    }
  }, [deferredSeguradoraSearch, seguradoraSortBy, seguradoraSortDirection])

  const loadTitularItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingTitular(true)
    setTitularStatusMessage('Carregando registros de titulares do CRM...')
    setTitularStatusTone('idle')

    try {
      const result = await listTitularItemsPaginated({
        search: deferredTitularSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: titularSortBy,
        sortDirection: titularSortDirection,
      })

      setTitularItems(result.items)
      setTitularTotalItems(result.total)
      setTitularTotalPages(result.totalPages)
      setTitularPage(result.page)
      setTitularSortBy(result.sortBy)
      setTitularSortDirection(result.sortDirection)
      setTitularStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela titular do CRM.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de titulares do CRM.'

      setTitularStatusTone('error')
      setTitularStatusMessage(message)
    } finally {
      setIsLoadingTitular(false)
    }
  }, [deferredTitularSearch, titularSortBy, titularSortDirection])

  const loadMarcaModeloItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingMarcaModelo(true)
    setMarcaModeloStatusMessage('Carregando registros de marca/modelo...')
    setMarcaModeloStatusTone('idle')

    try {
      const result = await listMarcaModeloItemsPaginated({
        search: deferredMarcaModeloSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: marcaModeloSortBy,
        sortDirection: marcaModeloSortDirection,
      })

      setMarcaModeloItems(result.items)
      setMarcaModeloTotalItems(result.total)
      setMarcaModeloTotalPages(result.totalPages)
      setMarcaModeloPage(result.page)
      setMarcaModeloSortBy(result.sortBy)
      setMarcaModeloSortDirection(result.sortDirection)
      setMarcaModeloStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela marca/modelo.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de marca/modelo.'

      setMarcaModeloStatusTone('error')
      setMarcaModeloStatusMessage(message)
    } finally {
      setIsLoadingMarcaModelo(false)
    }
  }, [deferredMarcaModeloSearch, marcaModeloSortBy, marcaModeloSortDirection])

  useEffect(() => {
    if (!session || activeView !== 'dre') {
      return
    }

    void loadDreItems(drePage)
  }, [activeView, drePage, loadDreItems, session])

  useEffect(() => {
    if (!session || activeView !== 'modalidade') {
      return
    }

    void loadModalidadeItems(modalidadePage)
  }, [activeView, loadModalidadeItems, modalidadePage, session])

  useEffect(() => {
    if (!session || activeView !== 'condicao') {
      return
    }

    void loadCondicaoItems(condicaoPage)
  }, [activeView, condicaoPage, loadCondicaoItems, session])

  useEffect(() => {
    if (!session || activeView !== 'tipoBancada') {
      return
    }

    void loadTipoBancadaItems(tipoBancadaPage)
    void loadAssociationOptions()
    void loadTipoBancadaAssociationItems()
  }, [activeView, loadTipoBancadaItems, loadAssociationOptions, loadTipoBancadaAssociationItems, session, tipoBancadaPage])

  useEffect(() => {
    if (!session || activeView !== 'tipoPgto') {
      return
    }

    void loadTipoPgtoItems(tipoPgtoPage)
  }, [activeView, loadTipoPgtoItems, session, tipoPgtoPage])

  useEffect(() => {
    if (!session || activeView !== 'modalBancadaTpPagtoCondicao') {
      return
    }

    void loadModalBancadaTpPagtoCondicaoOptions()
    void loadModalBancadaTpPagtoCondicaoItems(modalBancadaTpPagtoCondicaoPage)
  }, [activeView, loadModalBancadaTpPagtoCondicaoItems, loadModalBancadaTpPagtoCondicaoOptions, modalBancadaTpPagtoCondicaoPage, session])

  useEffect(() => {
    if (!session || activeView !== 'modalBancadaTpPagtoCondicaoValor') {
      return
    }

    void loadModalBancadaTpPagtoCondicaoValorOptions()
    void loadModalBancadaTpPagtoCondicaoValorItems(modalBancadaTpPagtoCondicaoValorPage)
  }, [
    activeView,
    loadModalBancadaTpPagtoCondicaoValorItems,
    loadModalBancadaTpPagtoCondicaoValorOptions,
    modalBancadaTpPagtoCondicaoValorPage,
    session,
  ])

  useEffect(() => {
    if (!session || activeView !== 'kmValor') {
      return
    }

    void loadKmValorOptions()
    void loadKmValorItems(kmValorPage)
  }, [activeView, kmValorPage, loadKmValorItems, loadKmValorOptions, session])

  useEffect(() => {
    if (!session || activeView !== 'continuaValor') {
      return
    }

    void loadContinuaValorItems(continuaValorPage)
  }, [activeView, continuaValorPage, loadContinuaValorItems, session])

  useEffect(() => {
    if (!session || activeView !== 'parametroVeiculo') {
      return
    }

    void loadParametroVeiculoOptions()
    void loadParametroVeiculoItems(parametroVeiculoPage)
  }, [activeView, loadParametroVeiculoItems, loadParametroVeiculoOptions, parametroVeiculoPage, session])

  useEffect(() => {
    if (!session || activeView !== 'seguradora') {
      return
    }

    void loadSeguradoraItems(seguradoraPage)
  }, [activeView, loadSeguradoraItems, seguradoraPage, session])

  useEffect(() => {
    if (!session || activeView !== 'marcaModelo') {
      return
    }

    void loadMarcaModeloItems(marcaModeloPage)
  }, [activeView, loadMarcaModeloItems, marcaModeloPage, session])

  useEffect(() => {
    setDrePage(1)
  }, [deferredDreSearch])

  useEffect(() => {
    setModalidadePage(1)
  }, [deferredModalidadeSearch])

  useEffect(() => {
    setTipoBancadaPage(1)
  }, [deferredTipoBancadaSearch])

  useEffect(() => {
    if (!session || activeView !== 'titular') {
      return
    }

    void loadTitularItems(titularPage)
  }, [activeView, loadTitularItems, session, titularPage])

  useEffect(() => {
    setTitularPage(1)
  }, [deferredTitularSearch])

  useEffect(() => {
    setSeguradoraPage(1)
  }, [deferredSeguradoraSearch])

  useEffect(() => {
    setMarcaModeloPage(1)
  }, [deferredMarcaModeloSearch])

  useEffect(() => {
    document.title = environmentName
      ? `${environmentName} - TEG Financ`
      : 'TEG Financ'
  }, [environmentName])

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    let hasError = false

    if (!trimmedEmail) {
      setEmailError('Informe o email.')
      hasError = true
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError('Digite um email valido.')
      hasError = true
    } else {
      setEmailError('')
    }

    if (!trimmedPassword) {
      setPasswordError('Informe a senha.')
      hasError = true
    } else {
      setPasswordError('')
    }

    if (hasError) {
      setStatusTone('error')
      setStatusMessage('Corrija os campos destacados para continuar.')
      return
    }

    setStatusMessage('Autenticando...')
    setStatusTone('idle')
    setIsSubmitting(true)

    try {
      const result = await authenticate({
        email: trimmedEmail,
        password: trimmedPassword,
      })

      const nextSession: StoredSession = {
        email: trimmedEmail,
        displayName: getUserDisplayName(result.user, trimmedEmail),
        token: result.token,
        user: result.user,
        payload: result.payload,
        authenticatedAt: new Date().toISOString(),
      }

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
      setStatusTone('success')
      setStatusMessage(`Login realizado com sucesso para ${nextSession.displayName}.`)
      setPassword('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha inesperada ao autenticar.'

      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setEmail('')
    setPassword('')
    setEmailError('')
    setPasswordError('')
    setStatusMessage('Fechando a aplicacao...')
    setStatusTone('idle')

    window.open('', '_self')
    window.close()
    window.location.replace('about:blank')
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
    setPassword('')
    setStatusTone('idle')
    setStatusMessage('Sessao encerrada.')
    setActiveView('inicio')
  }

  const handleRunFullSmoke = async () => {
    setIsRunningSmoke(true)
    setSmokeStatusTone('idle')
    setSmokeStatusMessage(`Executando smoke ${selectedSmokeSuite === 'all' ? 'completo da aplicacao' : `da suite ${selectedSmokeSuite}`}...`)
    setSmokeStdout('')
    setSmokeStderr('')
    setSmokeReportActionMessage('')

    try {
      const response = await fetch('/api/smoke/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ suite: selectedSmokeSuite }),
      })

      const payload = await response.json().catch(() => null) as SmokeRunResponse | null

      setSmokeResult(payload)
      setSmokeStdout(payload?.stdoutTail ?? '')
      setSmokeStderr(payload?.stderrTail ?? '')
      setSelectedSmokeLogStream(payload?.status === 'failed' ? 'stderr' : 'stdout')

      if (!response.ok) {
        throw new Error(payload?.message || 'Falha ao executar smoke da aplicacao.')
      }

      setSmokeStatusTone('success')
      setSmokeStatusMessage(payload?.message || 'Smoke completo executado com sucesso.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar smoke da aplicacao.'
      setSmokeStatusTone('error')
      setSmokeStatusMessage(message)
    } finally {
      setIsRunningSmoke(false)
    }
  }

  const handleCopySmokeReportPath = async () => {
    if (!smokeResult?.reportPath) {
      setSmokeReportActionMessage('Nenhum relatorio disponivel para copiar.')
      return
    }

    try {
      await navigator.clipboard.writeText(smokeResult.reportPath)
      setSmokeReportActionMessage('Caminho do relatorio copiado para a area de transferencia.')
    } catch {
      setSmokeReportActionMessage('Nao foi possivel copiar o caminho do relatorio.')
    }
  }

  const handleOpenSmokeReport = () => {
    if (!smokeResult?.report) {
      setSmokeReportActionMessage('Nenhum relatorio JSON disponivel para abrir.')
      return
    }

    const reportBlob = new Blob([`${JSON.stringify(smokeResult.report, null, 2)}\n`], { type: 'application/json' })
    const reportUrl = URL.createObjectURL(reportBlob)
    window.open(reportUrl, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000)
    setSmokeReportActionMessage('Relatorio JSON aberto em uma nova aba.')
  }

  const handleDownloadSmokeReport = () => {
    if (!smokeResult?.report) {
      setSmokeReportActionMessage('Nenhum relatorio JSON disponivel para download.')
      return
    }

    const reportBlob = new Blob([`${JSON.stringify(smokeResult.report, null, 2)}\n`], { type: 'application/json' })
    const reportUrl = URL.createObjectURL(reportBlob)
    const link = document.createElement('a')
    link.href = reportUrl
    link.download = getSmokeReportFileName(smokeResult)
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000)
    setSmokeReportActionMessage('Download do relatorio JSON iniciado.')
  }

  const resetDreForm = () => {
    setDreSigla('')
    setDreSiglaError('')
    setDreDescricao('')
    setDreDescricaoError('')
    setEditingDreCodigo(null)
    setDreFormMode('create')
  }

  const resetModalidadeForm = () => {
    setModalidadeDescricao('')
    setModalidadeDescricaoError('')
    setEditingModalidadeCodigo(null)
    setModalidadeFormMode('create')
  }

  const resetCondicaoForm = () => {
    setCondicaoDescricao('')
    setCondicaoDescricaoError('')
    setCondicaoQtdeIni('')
    setCondicaoQtdeIniError('')
    setCondicaoQtdeFim('')
    setCondicaoQtdeFimError('')
    setEditingCondicaoCodigo(null)
    setCondicaoFormMode('create')
  }

  const resetTipoBancadaForm = () => {
    setTipoBancadaDescricao('')
    setTipoBancadaDescricaoError('')
    setEditingTipoBancadaCodigo(null)
    setTipoBancadaFormMode('create')
  }

  const resetTipoPgtoForm = () => {
    setTipoPgtoDescricao('')
    setTipoPgtoDescricaoError('')
    setEditingTipoPgtoCodigo(null)
    setTipoPgtoFormMode('create')
  }

  const resetModalBancadaTpPagtoCondicaoForm = () => {
    setModalBancadaTpPagtoCondicaoAssociationCodigo('')
    setModalBancadaTpPagtoCondicaoTipoPgtoCodigo('')
    setModalBancadaTpPagtoCondicaoCondicaoCodigo('')
    setEditingModalBancadaTpPagtoCondicaoCodigo(null)
    setModalBancadaTpPagtoCondicaoFormMode('create')
  }

  const resetModalBancadaTpPagtoCondicaoValorForm = () => {
    setModalBancadaTpPagtoCondicaoValorAssociationCodigo('')
    setModalBancadaTpPagtoCondicaoValorData('')
    setModalBancadaTpPagtoCondicaoValorValor('')
    setEditingModalBancadaTpPagtoCondicaoValorCodigo(null)
    setModalBancadaTpPagtoCondicaoValorFormMode('create')
  }

  const resetKmValorForm = () => {
    setKmValorCondicaoCodigo('')
    setKmValorData('')
    setKmValorValor('')
    setEditingKmValorCodigo(null)
    setKmValorFormMode('create')
  }

  const resetContinuaValorForm = () => {
    setContinuaValorTipo('')
    setContinuaValorData('')
    setContinuaValorValor('')
    setEditingContinuaValorCodigo(null)
    setContinuaValorFormMode('create')
  }

  const resetParametroVeiculoForm = () => {
    setParametroVeiculoModalidadeTipoBancadaCodigo('')
    setParametroVeiculoCondicao('')
    setParametroVeiculoQtdeCondicao('')
    setParametroVeiculoData('')
    setEditingParametroVeiculoCodigo(null)
    setParametroVeiculoFormMode('create')
  }

  const handleStartInsertDre = () => {
    resetDreForm()
    setDreFormMode('create')
    setDreStatusTone('idle')
    setDreStatusMessage('')
    setIsDreFormVisible(true)
  }

  const handleStartInsertModalidade = () => {
    resetModalidadeForm()
    setModalidadeFormMode('create')
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage('')
    setIsModalidadeFormVisible(true)
  }

  const handleStartInsertCondicao = () => {
    resetCondicaoForm()
    setCondicaoFormMode('create')
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage('')
    setIsCondicaoFormVisible(true)
  }

  const handleStartInsertTipoBancada = () => {
    resetTipoBancadaForm()
    setTipoBancadaFormMode('create')
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage('')
    setIsTipoBancadaFormVisible(true)
  }

  const handleStartInsertTipoPgto = () => {
    resetTipoPgtoForm()
    setTipoPgtoFormMode('create')
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage('')
    setIsTipoPgtoFormVisible(true)
  }

  const handleStartInsertModalBancadaTpPagtoCondicao = () => {
    resetModalBancadaTpPagtoCondicaoForm()
    setModalBancadaTpPagtoCondicaoFormMode('create')
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('')
    setIsModalBancadaTpPagtoCondicaoFormVisible(true)
  }

  const handleStartInsertModalBancadaTpPagtoCondicaoValor = () => {
    resetModalBancadaTpPagtoCondicaoValorForm()
    setModalBancadaTpPagtoCondicaoValorFormMode('create')
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('')
    setIsModalBancadaTpPagtoCondicaoValorFormVisible(true)
  }

  const handleStartInsertKmValor = () => {
    resetKmValorForm()
    setKmValorFormMode('create')
    setKmValorStatusTone('idle')
    setKmValorStatusMessage('')
    setIsKmValorFormVisible(true)
  }

  const handleStartInsertContinuaValor = () => {
    resetContinuaValorForm()
    setContinuaValorFormMode('create')
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage('')
    setIsContinuaValorFormVisible(true)
  }

  const handleStartInsertParametroVeiculo = () => {
    resetParametroVeiculoForm()
    setParametroVeiculoFormMode('create')
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('')
    setIsParametroVeiculoFormVisible(true)
  }

  const handleFilterDreSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDrePage(1)
    setDreStatusMessage('Aplicando filtro da DRE...')
    setDreStatusTone('idle')
  }

  const handleClearDreFilter = () => {
    setDreSearch('')
    setDrePage(1)
  }

  const handleFilterModalidadeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setModalidadePage(1)
    setModalidadeStatusMessage('Aplicando filtro de modalidade...')
    setModalidadeStatusTone('idle')
  }

  const handleClearModalidadeFilter = () => {
    setModalidadeSearch('')
    setModalidadePage(1)
  }

  const handleFilterCondicaoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCondicaoPage(1)
    setCondicaoStatusMessage('Aplicando filtro de condicao...')
    setCondicaoStatusTone('idle')
  }

  const handleClearCondicaoFilter = () => {
    setCondicaoSearch('')
    setCondicaoPage(1)
  }

  const handleFilterTipoBancadaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTipoBancadaPage(1)
    setTipoBancadaStatusMessage('Aplicando filtro de tipo de bancada...')
    setTipoBancadaStatusTone('idle')
  }

  const handleClearTipoBancadaFilter = () => {
    setTipoBancadaSearch('')
    setTipoBancadaPage(1)
  }

  const handleFilterTipoPgtoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTipoPgtoPage(1)
    setTipoPgtoStatusMessage('Aplicando filtro de tipo de pagamento...')
    setTipoPgtoStatusTone('idle')
  }

  const handleClearTipoPgtoFilter = () => {
    setTipoPgtoSearch('')
    setTipoPgtoPage(1)
  }

  const handleFilterModalBancadaTpPagtoCondicaoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo(modalBancadaTpPagtoCondicaoFilterAssociationCodigo)
    setAppliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo(modalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo)
    setAppliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo(modalBancadaTpPagtoCondicaoFilterCondicaoCodigo)
    setModalBancadaTpPagtoCondicaoPage(1)
    setModalBancadaTpPagtoCondicaoStatusMessage('Aplicando filtro da associacao de modalidade, bancada, pagamento e condicao...')
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
  }

  const handleClearModalBancadaTpPagtoCondicaoFilter = () => {
    setModalBancadaTpPagtoCondicaoFilterAssociationCodigo('')
    setModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo('')
    setModalBancadaTpPagtoCondicaoFilterCondicaoCodigo('')
    setAppliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo('')
    setAppliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo('')
    setAppliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo('')
    setModalBancadaTpPagtoCondicaoPage(1)
  }

  const handleFilterModalBancadaTpPagtoCondicaoValorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo(modalBancadaTpPagtoCondicaoValorFilterAssociationCodigo)
    setAppliedModalBancadaTpPagtoCondicaoValorFilterData(modalBancadaTpPagtoCondicaoValorFilterData)
    setModalBancadaTpPagtoCondicaoValorPage(1)
    setModalBancadaTpPagtoCondicaoValorStatusMessage('Aplicando filtro de valor da associacao de modalidade, bancada, pagamento e condicao...')
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
  }

  const handleClearModalBancadaTpPagtoCondicaoValorFilter = () => {
    setModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo('')
    setModalBancadaTpPagtoCondicaoValorFilterData('')
    setAppliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo('')
    setAppliedModalBancadaTpPagtoCondicaoValorFilterData('')
    setModalBancadaTpPagtoCondicaoValorPage(1)
  }

  const handleFilterKmValorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedKmValorFilterCondicaoCodigo(kmValorFilterCondicaoCodigo)
    setAppliedKmValorFilterData(kmValorFilterData)
    setKmValorPage(1)
    setKmValorStatusMessage('Aplicando filtro de km valor...')
    setKmValorStatusTone('idle')
  }

  const handleClearKmValorFilter = () => {
    setKmValorFilterCondicaoCodigo('')
    setKmValorFilterData('')
    setAppliedKmValorFilterCondicaoCodigo('')
    setAppliedKmValorFilterData('')
    setKmValorPage(1)
  }

  const handleFilterContinuaValorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedContinuaValorFilterTipo(continuaValorFilterTipo)
    setAppliedContinuaValorFilterData(continuaValorFilterData)
    setContinuaValorPage(1)
    setContinuaValorStatusMessage('Aplicando filtro de continua valor...')
    setContinuaValorStatusTone('idle')
  }

  const handleClearContinuaValorFilter = () => {
    setContinuaValorFilterTipo('')
    setContinuaValorFilterData('')
    setAppliedContinuaValorFilterTipo('')
    setAppliedContinuaValorFilterData('')
    setContinuaValorPage(1)
  }

  const handleFilterParametroVeiculoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedParametroVeiculoFilterModalidadeTipoBancadaCodigo(parametroVeiculoFilterModalidadeTipoBancadaCodigo)
    setAppliedParametroVeiculoFilterCondicao(parametroVeiculoFilterCondicao)
    setAppliedParametroVeiculoFilterData(parametroVeiculoFilterData)
    setParametroVeiculoPage(1)
    setParametroVeiculoStatusMessage('Aplicando filtro de parametro veiculo...')
    setParametroVeiculoStatusTone('idle')
  }

  const handleClearParametroVeiculoFilter = () => {
    setParametroVeiculoFilterModalidadeTipoBancadaCodigo('')
    setParametroVeiculoFilterCondicao('')
    setParametroVeiculoFilterData('')
    setAppliedParametroVeiculoFilterModalidadeTipoBancadaCodigo('')
    setAppliedParametroVeiculoFilterCondicao('')
    setAppliedParametroVeiculoFilterData('')
    setParametroVeiculoPage(1)
  }

  const handleSortDre = (field: DreSortField) => {
    setDrePage(1)
    setDreSortBy((currentField) => {
      if (currentField === field) {
        setDreSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setDreSortDirection('asc')
      return field
    })
  }

  const getSortIndicator = (field: DreSortField) => {
    if (dreSortBy !== field) {
      return '↕'
    }

    return dreSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortModalidade = (field: DreSortField) => {
    setModalidadePage(1)
    setModalidadeSortBy((currentField) => {
      if (currentField === field) {
        setModalidadeSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setModalidadeSortDirection('asc')
      return field
    })
  }

  const getModalidadeSortIndicator = (field: DreSortField) => {
    if (modalidadeSortBy !== field) {
      return '↕'
    }

    return modalidadeSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortCondicao = (field: CondicaoSortField) => {
    setCondicaoPage(1)
    setCondicaoSortBy((currentField) => {
      if (currentField === field) {
        setCondicaoSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setCondicaoSortDirection('asc')
      return field
    })
  }

  const getCondicaoSortIndicator = (field: CondicaoSortField) => {
    if (condicaoSortBy !== field) {
      return '↕'
    }

    return condicaoSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortTipoPgto = (field: DreSortField) => {
    setTipoPgtoPage(1)
    setTipoPgtoSortBy((currentField) => {
      if (currentField === field) {
        setTipoPgtoSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setTipoPgtoSortDirection('asc')
      return field
    })
  }

  const getTipoPgtoSortIndicator = (field: DreSortField) => {
    if (tipoPgtoSortBy !== field) {
      return '↕'
    }

    return tipoPgtoSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortTipoBancada = (field: DreSortField) => {
    setTipoBancadaPage(1)
    setTipoBancadaSortBy((currentField) => {
      if (currentField === field) {
        setTipoBancadaSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setTipoBancadaSortDirection('asc')
      return field
    })
  }

  const getTipoBancadaSortIndicator = (field: DreSortField) => {
    if (tipoBancadaSortBy !== field) {
      return '↕'
    }

    return tipoBancadaSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleStartEditDre = (item: DreItem) => {
    setEditingDreCodigo(item.codigo)
    setDreFormMode('edit')
    setDreSigla(item.sigla)
    setDreSiglaError('')
    setDreDescricao(item.descricao)
    setDreDescricaoError('')
    setDreStatusTone('idle')
    setDreStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsDreFormVisible(true)
  }

  const handleStartViewDre = (item: DreItem) => {
    setEditingDreCodigo(item.codigo)
    setDreFormMode('view')
    setDreSigla(item.sigla)
    setDreSiglaError('')
    setDreDescricao(item.descricao)
    setDreDescricaoError('')
    setDreStatusTone('idle')
    setDreStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsDreFormVisible(true)
  }

  const handleCancelDreForm = () => {
    resetDreForm()
    setIsDreFormVisible(false)
    setDreStatusTone('idle')
    setDreStatusMessage('')
  }

  const handleStartEditModalidade = (item: ModalidadeItem) => {
    setEditingModalidadeCodigo(item.codigo)
    setModalidadeFormMode('edit')
    setModalidadeDescricao(item.descricao)
    setModalidadeDescricaoError('')
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsModalidadeFormVisible(true)
  }

  const handleStartViewModalidade = (item: ModalidadeItem) => {
    setEditingModalidadeCodigo(item.codigo)
    setModalidadeFormMode('view')
    setModalidadeDescricao(item.descricao)
    setModalidadeDescricaoError('')
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsModalidadeFormVisible(true)
  }

  const handleStartEditCondicao = (item: CondicaoItem) => {
    setEditingCondicaoCodigo(item.codigo)
    setCondicaoFormMode('edit')
    setCondicaoDescricao(item.descricao)
    setCondicaoDescricaoError('')
    setCondicaoQtdeIni(String(item.qtdeIni))
    setCondicaoQtdeIniError('')
    setCondicaoQtdeFim(String(item.qtdeFim))
    setCondicaoQtdeFimError('')
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsCondicaoFormVisible(true)
  }

  const handleStartViewCondicao = (item: CondicaoItem) => {
    setEditingCondicaoCodigo(item.codigo)
    setCondicaoFormMode('view')
    setCondicaoDescricao(item.descricao)
    setCondicaoDescricaoError('')
    setCondicaoQtdeIni(String(item.qtdeIni))
    setCondicaoQtdeIniError('')
    setCondicaoQtdeFim(String(item.qtdeFim))
    setCondicaoQtdeFimError('')
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsCondicaoFormVisible(true)
  }

  const handleStartEditModalBancadaTpPagtoCondicao = (item: ModalBancadaTpPagtoCondicaoItem) => {
    setEditingModalBancadaTpPagtoCondicaoCodigo(item.codigo)
    setModalBancadaTpPagtoCondicaoFormMode('edit')
    setModalBancadaTpPagtoCondicaoAssociationCodigo(item.modalidadeTipoBancadaCodigo)
    setModalBancadaTpPagtoCondicaoTipoPgtoCodigo(item.tipoPgtoCodigo)
    setModalBancadaTpPagtoCondicaoCondicaoCodigo(item.condicaoCodigo)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsModalBancadaTpPagtoCondicaoFormVisible(true)
  }

  const handleStartViewModalBancadaTpPagtoCondicao = (item: ModalBancadaTpPagtoCondicaoItem) => {
    setEditingModalBancadaTpPagtoCondicaoCodigo(item.codigo)
    setModalBancadaTpPagtoCondicaoFormMode('view')
    setModalBancadaTpPagtoCondicaoAssociationCodigo(item.modalidadeTipoBancadaCodigo)
    setModalBancadaTpPagtoCondicaoTipoPgtoCodigo(item.tipoPgtoCodigo)
    setModalBancadaTpPagtoCondicaoCondicaoCodigo(item.condicaoCodigo)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsModalBancadaTpPagtoCondicaoFormVisible(true)
  }

  const handleStartEditModalBancadaTpPagtoCondicaoValor = (item: ModalBancadaTpPagtoCondicaoValorItem) => {
    setEditingModalBancadaTpPagtoCondicaoValorCodigo(item.codigo)
    setModalBancadaTpPagtoCondicaoValorFormMode('edit')
    setModalBancadaTpPagtoCondicaoValorAssociationCodigo(item.modalBancadaTpPagtoCondicaoCodigo)
    setModalBancadaTpPagtoCondicaoValorData(item.data)
    setModalBancadaTpPagtoCondicaoValorValor(String(item.valor))
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsModalBancadaTpPagtoCondicaoValorFormVisible(true)
  }

  const handleStartViewModalBancadaTpPagtoCondicaoValor = (item: ModalBancadaTpPagtoCondicaoValorItem) => {
    setEditingModalBancadaTpPagtoCondicaoValorCodigo(item.codigo)
    setModalBancadaTpPagtoCondicaoValorFormMode('view')
    setModalBancadaTpPagtoCondicaoValorAssociationCodigo(item.modalBancadaTpPagtoCondicaoCodigo)
    setModalBancadaTpPagtoCondicaoValorData(item.data)
    setModalBancadaTpPagtoCondicaoValorValor(String(item.valor))
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsModalBancadaTpPagtoCondicaoValorFormVisible(true)
  }

  const handleStartEditKmValor = (item: KmValorItem) => {
    setEditingKmValorCodigo(item.codigo)
    setKmValorFormMode('edit')
    setKmValorCondicaoCodigo(item.condicaoCodigo)
    setKmValorData(item.data)
    setKmValorValor(formatCurrencyInput(item.valor))
    setKmValorStatusTone('idle')
    setKmValorStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsKmValorFormVisible(true)
  }

  const handleStartViewKmValor = (item: KmValorItem) => {
    setEditingKmValorCodigo(item.codigo)
    setKmValorFormMode('view')
    setKmValorCondicaoCodigo(item.condicaoCodigo)
    setKmValorData(item.data)
    setKmValorValor(formatCurrencyInput(item.valor))
    setKmValorStatusTone('idle')
    setKmValorStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsKmValorFormVisible(true)
  }

  const handleStartEditContinuaValor = (item: ContinuaValorItem) => {
    setEditingContinuaValorCodigo(item.codigo)
    setContinuaValorFormMode('edit')
    setContinuaValorTipo(item.tipoContinua)
    setContinuaValorData(item.data)
    setContinuaValorValor(formatCurrencyInput(item.valor))
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsContinuaValorFormVisible(true)
  }

  const handleStartViewContinuaValor = (item: ContinuaValorItem) => {
    setEditingContinuaValorCodigo(item.codigo)
    setContinuaValorFormMode('view')
    setContinuaValorTipo(item.tipoContinua)
    setContinuaValorData(item.data)
    setContinuaValorValor(formatCurrencyInput(item.valor))
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsContinuaValorFormVisible(true)
  }

  const handleStartEditParametroVeiculo = (item: ParametroVeiculoItem) => {
    setEditingParametroVeiculoCodigo(item.codigo)
    setParametroVeiculoFormMode('edit')
    setParametroVeiculoModalidadeTipoBancadaCodigo(item.modalidadeTipoBancadaCodigo)
    setParametroVeiculoCondicao(item.condicao)
    setParametroVeiculoQtdeCondicao(String(item.qtdeCondicao))
    setParametroVeiculoData(item.data)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsParametroVeiculoFormVisible(true)
  }

  const handleStartViewParametroVeiculo = (item: ParametroVeiculoItem) => {
    setEditingParametroVeiculoCodigo(item.codigo)
    setParametroVeiculoFormMode('view')
    setParametroVeiculoModalidadeTipoBancadaCodigo(item.modalidadeTipoBancadaCodigo)
    setParametroVeiculoCondicao(item.condicao)
    setParametroVeiculoQtdeCondicao(String(item.qtdeCondicao))
    setParametroVeiculoData(item.data)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsParametroVeiculoFormVisible(true)
  }

  const handleCancelModalidadeForm = () => {
    resetModalidadeForm()
    setIsModalidadeFormVisible(false)
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage('')
  }

  const handleCancelCondicaoForm = () => {
    resetCondicaoForm()
    setIsCondicaoFormVisible(false)
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage('')
  }

  const handleCancelModalBancadaTpPagtoCondicaoForm = () => {
    resetModalBancadaTpPagtoCondicaoForm()
    setIsModalBancadaTpPagtoCondicaoFormVisible(false)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('')
  }

  const handleCancelModalBancadaTpPagtoCondicaoValorForm = () => {
    resetModalBancadaTpPagtoCondicaoValorForm()
    setIsModalBancadaTpPagtoCondicaoValorFormVisible(false)
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('')
  }

  const handleCancelKmValorForm = () => {
    resetKmValorForm()
    setIsKmValorFormVisible(false)
    setKmValorStatusTone('idle')
    setKmValorStatusMessage('')
  }

  const handleCancelContinuaValorForm = () => {
    resetContinuaValorForm()
    setIsContinuaValorFormVisible(false)
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage('')
  }

  const handleCancelParametroVeiculoForm = () => {
    resetParametroVeiculoForm()
    setIsParametroVeiculoFormVisible(false)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('')
  }

  useEffect(() => {
    if (!isKmValorFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingKmValor) {
        handleCancelKmValorForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelKmValorForm, isKmValorFormVisible, isSavingKmValor])

  useEffect(() => {
    if (!isContinuaValorFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingContinuaValor) {
        handleCancelContinuaValorForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelContinuaValorForm, isContinuaValorFormVisible, isSavingContinuaValor])

  useEffect(() => {
    if (!isParametroVeiculoFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingParametroVeiculo) {
        handleCancelParametroVeiculoForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelParametroVeiculoForm, isParametroVeiculoFormVisible, isSavingParametroVeiculo])

  const handleStartEditTipoBancada = (item: TipoBancadaItem) => {
    setEditingTipoBancadaCodigo(item.codigo)
    setTipoBancadaFormMode('edit')
    setTipoBancadaDescricao(item.descricao)
    setTipoBancadaDescricaoError('')
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsTipoBancadaFormVisible(true)
  }

  const handleStartViewTipoBancada = (item: TipoBancadaItem) => {
    setEditingTipoBancadaCodigo(item.codigo)
    setTipoBancadaFormMode('view')
    setTipoBancadaDescricao(item.descricao)
    setTipoBancadaDescricaoError('')
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsTipoBancadaFormVisible(true)
  }

  const handleStartEditTipoPgto = (item: TipoPgtoItem) => {
    setEditingTipoPgtoCodigo(item.codigo)
    setTipoPgtoFormMode('edit')
    setTipoPgtoDescricao(item.descricao)
    setTipoPgtoDescricaoError('')
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsTipoPgtoFormVisible(true)
  }

  const handleStartViewTipoPgto = (item: TipoPgtoItem) => {
    setEditingTipoPgtoCodigo(item.codigo)
    setTipoPgtoFormMode('view')
    setTipoPgtoDescricao(item.descricao)
    setTipoPgtoDescricaoError('')
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsTipoPgtoFormVisible(true)
  }

  const handleCancelTipoBancadaForm = () => {
    resetTipoBancadaForm()
    setIsTipoBancadaFormVisible(false)
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage('')
  }

  const handleCancelTipoPgtoForm = () => {
    resetTipoPgtoForm()
    setIsTipoPgtoFormVisible(false)
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage('')
  }

  useEffect(() => {
    if (!isModalidadeFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingModalidade) {
        handleCancelModalidadeForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelModalidadeForm, isModalidadeFormVisible, isSavingModalidade])

  useEffect(() => {
    if (!isTipoBancadaFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingTipoBancada) {
        handleCancelTipoBancadaForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelTipoBancadaForm, isSavingTipoBancada, isTipoBancadaFormVisible])

  useEffect(() => {
    if (!isTipoPgtoFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingTipoPgto) {
        handleCancelTipoPgtoForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelTipoPgtoForm, isSavingTipoPgto, isTipoPgtoFormVisible])

  useEffect(() => {
    if (!isCondicaoFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingCondicao) {
        handleCancelCondicaoForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelCondicaoForm, isCondicaoFormVisible, isSavingCondicao])

  const handleCreateDre = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (dreFormMode === 'view') {
      setDreStatusTone('idle')
      setDreStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedSigla = normalizeDreSiglaInput(dreSigla)
    const normalizedDescricao = dreDescricao.trim()
    const editingCodigo = editingDreCodigo
    let hasError = false

    setDreSiglaError('')
    setDreDescricaoError('')

    if (normalizedSigla.length !== 2) {
      setDreSiglaError('Sigla deve conter 2 letras maiusculas.')
      hasError = true
    }

    if (!normalizedDescricao) {
      setDreDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setDreStatusTone('error')
      setDreStatusMessage('Corrija os campos da DRE para continuar.')
      return
    }

    setIsSavingDre(true)
    setDreStatusTone('idle')
    setDreStatusMessage(editingCodigo ? 'Alterando registro da DRE...' : 'Gravando registro da DRE...')

    try {
      const savedItem = editingCodigo
        ? await updateDreItem(editingCodigo, {
            sigla: normalizedSigla,
            descricao: normalizedDescricao,
          })
        : await createDreItem({
            sigla: normalizedSigla,
            descricao: normalizedDescricao,
          })

      void savedItem
      resetDreForm()
      setIsDreFormVisible(false)
      setDreStatusTone('success')
      setDreStatusMessage(editingCodigo ? 'Registro da DRE alterado com sucesso.' : 'Registro da DRE cadastrado com sucesso.')
      await loadDreItems(editingCodigo ? drePage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro da DRE.'

      setDreStatusTone('error')
      setDreStatusMessage(message)
    } finally {
      setIsSavingDre(false)
    }
  }

  const handleCreateModalidade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (modalidadeFormMode === 'view') {
      setModalidadeStatusTone('idle')
      setModalidadeStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = modalidadeDescricao.trim()
    const editingCodigo = editingModalidadeCodigo
    let hasError = false

    setModalidadeDescricaoError('')

    if (!normalizedDescricao) {
      setModalidadeDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setModalidadeStatusTone('error')
      setModalidadeStatusMessage('Corrija os campos da modalidade para continuar.')
      return
    }

    setIsSavingModalidade(true)
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage(editingCodigo ? 'Alterando registro da modalidade...' : 'Gravando registro da modalidade...')

    try {
      const savedItem = editingCodigo
        ? await updateModalidadeItem(editingCodigo, {
            descricao: normalizedDescricao,
          })
        : await createModalidadeItem({
            descricao: normalizedDescricao,
          })

      void savedItem
      resetModalidadeForm()
      setIsModalidadeFormVisible(false)
      setModalidadeStatusTone('success')
      setModalidadeStatusMessage(editingCodigo ? 'Registro da modalidade alterado com sucesso.' : 'Registro da modalidade cadastrado com sucesso.')
      await loadModalidadeItems(editingCodigo ? modalidadePage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro da modalidade.'

      setModalidadeStatusTone('error')
      setModalidadeStatusMessage(message)
    } finally {
      setIsSavingModalidade(false)
    }
  }

  const handleCreateCondicao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (condicaoFormMode === 'view') {
      setCondicaoStatusTone('idle')
      setCondicaoStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = condicaoDescricao.trim()
    const normalizedQtdeIni = condicaoQtdeIni.trim()
    const normalizedQtdeFim = condicaoQtdeFim.trim()
    const editingCodigo = editingCondicaoCodigo
    let hasError = false

    setCondicaoDescricaoError('')
    setCondicaoQtdeIniError('')
    setCondicaoQtdeFimError('')

    if (!normalizedDescricao) {
      setCondicaoDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (!/^\d+$/.test(normalizedQtdeIni)) {
      setCondicaoQtdeIniError('Qtde inicial deve ser um numero inteiro maior ou igual a zero.')
      hasError = true
    }

    if (!/^\d+$/.test(normalizedQtdeFim)) {
      setCondicaoQtdeFimError('Qtde final deve ser um numero inteiro maior ou igual a zero.')
      hasError = true
    }

    const parsedQtdeIni = /^\d+$/.test(normalizedQtdeIni) ? Number(normalizedQtdeIni) : Number.NaN
    const parsedQtdeFim = /^\d+$/.test(normalizedQtdeFim) ? Number(normalizedQtdeFim) : Number.NaN

    if (!Number.isNaN(parsedQtdeIni) && !Number.isNaN(parsedQtdeFim) && parsedQtdeFim < parsedQtdeIni) {
      setCondicaoQtdeFimError('Qtde final deve ser maior ou igual a qtde inicial.')
      hasError = true
    }

    if (hasError) {
      setCondicaoStatusTone('error')
      setCondicaoStatusMessage('Corrija os campos da condicao para continuar.')
      return
    }

    setIsSavingCondicao(true)
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage(editingCodigo ? 'Alterando registro da condicao...' : 'Gravando registro da condicao...')

    try {
      const savedItem = editingCodigo
        ? await updateCondicaoItem(editingCodigo, {
            descricao: normalizedDescricao,
            qtdeIni: parsedQtdeIni,
            qtdeFim: parsedQtdeFim,
          })
        : await createCondicaoItem({
            descricao: normalizedDescricao,
            qtdeIni: parsedQtdeIni,
            qtdeFim: parsedQtdeFim,
          })

      void savedItem
      resetCondicaoForm()
      setIsCondicaoFormVisible(false)
      setCondicaoStatusTone('success')
      setCondicaoStatusMessage(editingCodigo ? 'Registro da condicao alterado com sucesso.' : 'Registro da condicao cadastrado com sucesso.')
      await loadCondicaoItems(editingCodigo ? condicaoPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro da condicao.'

      setCondicaoStatusTone('error')
      setCondicaoStatusMessage(message)
    } finally {
      setIsSavingCondicao(false)
    }
  }

  const handleCreateTipoBancada = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (tipoBancadaFormMode === 'view') {
      setTipoBancadaStatusTone('idle')
      setTipoBancadaStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = tipoBancadaDescricao.trim()
    const editingCodigo = editingTipoBancadaCodigo
    let hasError = false

    setTipoBancadaDescricaoError('')

    if (!normalizedDescricao) {
      setTipoBancadaDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setTipoBancadaStatusTone('error')
      setTipoBancadaStatusMessage('Corrija os campos do tipo de bancada para continuar.')
      return
    }

    setIsSavingTipoBancada(true)
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage(editingCodigo ? 'Alterando registro do tipo de bancada...' : 'Gravando registro do tipo de bancada...')

    try {
      const savedItem = editingCodigo
        ? await updateTipoBancadaItem(editingCodigo, {
            descricao: normalizedDescricao,
          })
        : await createTipoBancadaItem({
            descricao: normalizedDescricao,
          })

      void savedItem
      resetTipoBancadaForm()
      setIsTipoBancadaFormVisible(false)
      setTipoBancadaStatusTone('success')
      setTipoBancadaStatusMessage(editingCodigo ? 'Registro do tipo de bancada alterado com sucesso.' : 'Registro do tipo de bancada cadastrado com sucesso.')
      await loadTipoBancadaItems(editingCodigo ? tipoBancadaPage : 1)
      await Promise.all([
        loadAssociationOptions(),
        loadTipoBancadaAssociationItems(),
      ])
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro do tipo de bancada.'

      setTipoBancadaStatusTone('error')
      setTipoBancadaStatusMessage(message)
    } finally {
      setIsSavingTipoBancada(false)
    }
  }

  const handleCreateTipoPgto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (tipoPgtoFormMode === 'view') {
      setTipoPgtoStatusTone('idle')
      setTipoPgtoStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = tipoPgtoDescricao.trim()
    const editingCodigo = editingTipoPgtoCodigo
    let hasError = false

    setTipoPgtoDescricaoError('')

    if (!normalizedDescricao) {
      setTipoPgtoDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setTipoPgtoStatusTone('error')
      setTipoPgtoStatusMessage('Corrija os campos do tipo de pagamento para continuar.')
      return
    }

    setIsSavingTipoPgto(true)
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage(editingCodigo ? 'Alterando registro do tipo de pagamento...' : 'Gravando registro do tipo de pagamento...')

    try {
      const savedItem = editingCodigo
        ? await updateTipoPgtoItem(editingCodigo, {
            descricao: normalizedDescricao,
          })
        : await createTipoPgtoItem({
            descricao: normalizedDescricao,
          })

      void savedItem
      resetTipoPgtoForm()
      setIsTipoPgtoFormVisible(false)
      setTipoPgtoStatusTone('success')
      setTipoPgtoStatusMessage(editingCodigo ? 'Registro do tipo de pagamento alterado com sucesso.' : 'Registro do tipo de pagamento cadastrado com sucesso.')
      await loadTipoPgtoItems(editingCodigo ? tipoPgtoPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro do tipo de pagamento.'

      setTipoPgtoStatusTone('error')
      setTipoPgtoStatusMessage(message)
    } finally {
      setIsSavingTipoPgto(false)
    }
  }

  const handleDeleteDre = async (item: DreItem) => {
    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingDre(true)
    setDreStatusTone('idle')
    setDreStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteDreItem(item.codigo)
      setDreItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingDreCodigo === item.codigo) {
        resetDreForm()
        setIsDreFormVisible(false)
      }

      setDreStatusTone('success')
      setDreStatusMessage('Registro da DRE excluido com sucesso.')
      const nextPage = dreItems.length === 1 && drePage > 1 ? drePage - 1 : drePage
      await loadDreItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro da DRE.'

      setDreStatusTone('error')
      setDreStatusMessage(message)
    } finally {
      setIsDeletingDre(false)
    }
  }

  const handleDeleteModalidade = async (item: ModalidadeItem) => {
    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingModalidade(true)
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteModalidadeItem(item.codigo)
      setModalidadeItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingModalidadeCodigo === item.codigo) {
        resetModalidadeForm()
        setIsModalidadeFormVisible(false)
      }

      setModalidadeStatusTone('success')
      setModalidadeStatusMessage('Registro da modalidade excluido com sucesso.')
      const nextPage = modalidadeItems.length === 1 && modalidadePage > 1 ? modalidadePage - 1 : modalidadePage
      await loadModalidadeItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro da modalidade.'

      setModalidadeStatusTone('error')
      setModalidadeStatusMessage(message)
    } finally {
      setIsDeletingModalidade(false)
    }
  }

  const handleDeleteCondicao = async (item: CondicaoItem) => {
    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingCondicao(true)
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteCondicaoItem(item.codigo)
      setCondicaoItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingCondicaoCodigo === item.codigo) {
        resetCondicaoForm()
        setIsCondicaoFormVisible(false)
      }

      setCondicaoStatusTone('success')
      setCondicaoStatusMessage('Registro da condicao excluido com sucesso.')
      const nextPage = condicaoItems.length === 1 && condicaoPage > 1 ? condicaoPage - 1 : condicaoPage
      await loadCondicaoItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro da condicao.'

      setCondicaoStatusTone('error')
      setCondicaoStatusMessage(message)
    } finally {
      setIsDeletingCondicao(false)
    }
  }

  const handleDeleteTipoBancada = async (item: TipoBancadaItem) => {
    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTipoBancada(true)
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteTipoBancadaItem(item.codigo)
      setTipoBancadaItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingTipoBancadaCodigo === item.codigo) {
        resetTipoBancadaForm()
        setIsTipoBancadaFormVisible(false)
      }

      setTipoBancadaStatusTone('success')
      setTipoBancadaStatusMessage('Registro do tipo de bancada excluido com sucesso.')
      const nextPage = tipoBancadaItems.length === 1 && tipoBancadaPage > 1 ? tipoBancadaPage - 1 : tipoBancadaPage
      await loadTipoBancadaItems(nextPage)
      await Promise.all([
        loadAssociationOptions(),
        loadTipoBancadaAssociationItems(),
      ])
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro do tipo de bancada.'

      setTipoBancadaStatusTone('error')
      setTipoBancadaStatusMessage(message)
    } finally {
      setIsDeletingTipoBancada(false)
    }
  }

  const handleDeleteTipoPgto = async (item: TipoPgtoItem) => {
    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTipoPgto(true)
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteTipoPgtoItem(item.codigo)
      setTipoPgtoItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingTipoPgtoCodigo === item.codigo) {
        resetTipoPgtoForm()
        setIsTipoPgtoFormVisible(false)
      }

      setTipoPgtoStatusTone('success')
      setTipoPgtoStatusMessage('Registro do tipo de pagamento excluido com sucesso.')
      const nextPage = tipoPgtoItems.length === 1 && tipoPgtoPage > 1 ? tipoPgtoPage - 1 : tipoPgtoPage
      await loadTipoPgtoItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro do tipo de pagamento.'

      setTipoPgtoStatusTone('error')
      setTipoPgtoStatusMessage(message)
    } finally {
      setIsDeletingTipoPgto(false)
    }
  }

  const resetTitularForm = () => {
    setTitularCnpjCpf('')
    setTitularNome('')
    setTitularCnpjCpfError('')
    setTitularNomeError('')
    setEditingTitularCodigo(null)
    setTitularFormMode('create')
  }

  const handleStartInsertTitular = () => {
    resetTitularForm()
    setTitularFormMode('create')
    setTitularStatusTone('idle')
    setTitularStatusMessage('')
    setIsTitularFormVisible(true)
  }

  const handleFilterTitularSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTitularPage(1)
    setTitularStatusMessage('Aplicando filtro de titular do CRM...')
    setTitularStatusTone('idle')
  }

  const handleClearTitularFilter = () => {
    setTitularSearch('')
    setTitularPage(1)
  }

  const handleSortTitular = (field: TitularSortField) => {
    setTitularPage(1)
    setTitularSortBy((currentField) => {
      if (currentField === field) {
        setTitularSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setTitularSortDirection('asc')
      return field
    })
  }

  const getTitularSortIndicator = (field: TitularSortField) => {
    if (titularSortBy !== field) {
      return '↕'
    }

    return titularSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleStartEditTitular = (item: TitularItem) => {
    setEditingTitularCodigo(item.codigo)
    setTitularFormMode('edit')
    setTitularCnpjCpf(formatCpfOrCnpj(item.cnpj_cpf))
    setTitularNome(item.titular)
    setTitularCnpjCpfError('')
    setTitularNomeError('')
    setTitularStatusTone('idle')
    setTitularStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsTitularFormVisible(true)
  }

  const handleStartViewTitular = (item: TitularItem) => {
    setEditingTitularCodigo(item.codigo)
    setTitularFormMode('view')
    setTitularCnpjCpf(formatCpfOrCnpj(item.cnpj_cpf))
    setTitularNome(item.titular)
    setTitularCnpjCpfError('')
    setTitularNomeError('')
    setTitularStatusTone('idle')
    setTitularStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsTitularFormVisible(true)
  }

  const handleCancelTitularForm = () => {
    resetTitularForm()
    setIsTitularFormVisible(false)
    setTitularStatusTone('idle')
    setTitularStatusMessage('')
  }

  const handleCreateTitular = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (titularFormMode === 'view') {
      setTitularStatusTone('idle')
      setTitularStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedCnpjCpf = titularCnpjCpf.trim()
    const normalizedTitular = titularNome.trim()
    const editingCodigo = editingTitularCodigo
    let hasError = false

    setTitularCnpjCpfError('')
    setTitularNomeError('')

    if (!normalizedCnpjCpf) {
      setTitularCnpjCpfError('CNPJ/CPF e obrigatorio.')
      hasError = true
    }

    if (!normalizedTitular) {
      setTitularNomeError('Titular do CRM e obrigatorio.')
      hasError = true
    }

    if (hasError) {
      setTitularStatusTone('error')
      setTitularStatusMessage('Corrija os campos de titular do CRM para continuar.')
      return
    }

    setIsSavingTitular(true)
    setTitularStatusTone('idle')
    setTitularStatusMessage(editingCodigo ? 'Alterando registro de titular do CRM...' : 'Gravando registro de titular do CRM...')

    try {
      const savedItem = editingCodigo
        ? await updateTitularItem(editingCodigo, {
            cnpj_cpf: normalizedCnpjCpf,
            titular: normalizedTitular,
          })
        : await createTitularItem({
            cnpj_cpf: normalizedCnpjCpf,
            titular: normalizedTitular,
          })

      void savedItem
      resetTitularForm()
      setIsTitularFormVisible(false)
      setTitularStatusTone('success')
      setTitularStatusMessage(editingCodigo ? 'Registro de titular do CRM alterado com sucesso.' : 'Registro de titular do CRM cadastrado com sucesso.')
      await loadTitularItems(editingCodigo ? titularPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar titular do CRM.'

      setTitularStatusTone('error')
      setTitularStatusMessage(message)
    } finally {
      setIsSavingTitular(false)
    }
  }

  const handleDeleteTitular = async (item: TitularItem) => {
    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.titular}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTitular(true)
    setTitularStatusTone('idle')
    setTitularStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteTitularItem(item.codigo)
      setTitularItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingTitularCodigo === item.codigo) {
        resetTitularForm()
        setIsTitularFormVisible(false)
      }

      setTitularStatusTone('success')
      setTitularStatusMessage('Registro de titular do CRM excluido com sucesso.')
      const nextPage = titularItems.length === 1 && titularPage > 1 ? titularPage - 1 : titularPage
      await loadTitularItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir titular do CRM.'

      setTitularStatusTone('error')
      setTitularStatusMessage(message)
    } finally {
      setIsDeletingTitular(false)
    }
  }

  const resetMarcaModeloForm = () => {
    setMarcaModeloDescricao('')
    setMarcaModeloDescricaoError('')
    setEditingMarcaModeloCodigo(null)
    setMarcaModeloFormMode('create')
  }

  const handleStartInsertMarcaModelo = () => {
    resetMarcaModeloForm()
    setMarcaModeloFormMode('create')
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage('')
    setIsMarcaModeloFormVisible(true)
  }

  const handleFilterMarcaModeloSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMarcaModeloPage(1)
    setMarcaModeloStatusMessage('Aplicando filtro de marca/modelo...')
    setMarcaModeloStatusTone('idle')
  }

  const handleClearMarcaModeloFilter = () => {
    setMarcaModeloSearch('')
    setMarcaModeloPage(1)
  }

  const handleSortMarcaModelo = (field: MarcaModeloSortField) => {
    setMarcaModeloPage(1)
    setMarcaModeloSortBy((currentField) => {
      if (currentField === field) {
        setMarcaModeloSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setMarcaModeloSortDirection('asc')
      return field
    })
  }

  const getMarcaModeloSortIndicator = (field: MarcaModeloSortField) => {
    if (marcaModeloSortBy !== field) {
      return '↕'
    }

    return marcaModeloSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleStartEditMarcaModelo = (item: MarcaModeloItem) => {
    setEditingMarcaModeloCodigo(item.codigo)
    setMarcaModeloFormMode('edit')
    setMarcaModeloDescricao(item.descricao)
    setMarcaModeloDescricaoError('')
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsMarcaModeloFormVisible(true)
  }

  const handleStartViewMarcaModelo = (item: MarcaModeloItem) => {
    setEditingMarcaModeloCodigo(item.codigo)
    setMarcaModeloFormMode('view')
    setMarcaModeloDescricao(item.descricao)
    setMarcaModeloDescricaoError('')
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsMarcaModeloFormVisible(true)
  }

  const handleCancelMarcaModeloForm = () => {
    resetMarcaModeloForm()
    setIsMarcaModeloFormVisible(false)
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage('')
  }

  const handleCreateMarcaModelo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (marcaModeloFormMode === 'view') {
      setMarcaModeloStatusTone('idle')
      setMarcaModeloStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = marcaModeloDescricao.trim()
    const editingCodigo = editingMarcaModeloCodigo
    let hasError = false

    setMarcaModeloDescricaoError('')

    if (!normalizedDescricao) {
      setMarcaModeloDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setMarcaModeloStatusTone('error')
      setMarcaModeloStatusMessage('Corrija os campos de marca/modelo para continuar.')
      return
    }

    setIsSavingMarcaModelo(true)
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage(editingCodigo ? 'Alterando registro de marca/modelo...' : 'Gravando registro de marca/modelo...')

    try {
      const savedItem = editingCodigo
        ? await updateMarcaModeloItem(editingCodigo, {
            descricao: normalizedDescricao,
          })
        : await createMarcaModeloItem({
            descricao: normalizedDescricao,
          })

      void savedItem
      resetMarcaModeloForm()
      setIsMarcaModeloFormVisible(false)
      setMarcaModeloStatusTone('success')
      setMarcaModeloStatusMessage(editingCodigo ? 'Registro de marca/modelo alterado com sucesso.' : 'Registro de marca/modelo cadastrado com sucesso.')
      await loadMarcaModeloItems(editingCodigo ? marcaModeloPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro de marca/modelo.'

      setMarcaModeloStatusTone('error')
      setMarcaModeloStatusMessage(message)
    } finally {
      setIsSavingMarcaModelo(false)
    }
  }

  const handleDeleteMarcaModelo = async (item: MarcaModeloItem) => {
    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingMarcaModelo(true)
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteMarcaModeloItem(item.codigo)
      setMarcaModeloItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingMarcaModeloCodigo === item.codigo) {
        resetMarcaModeloForm()
        setIsMarcaModeloFormVisible(false)
      }

      setMarcaModeloStatusTone('success')
      setMarcaModeloStatusMessage('Registro de marca/modelo excluido com sucesso.')
      const nextPage = marcaModeloItems.length === 1 && marcaModeloPage > 1 ? marcaModeloPage - 1 : marcaModeloPage
      await loadMarcaModeloItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro de marca/modelo.'

      setMarcaModeloStatusTone('error')
      setMarcaModeloStatusMessage(message)
    } finally {
      setIsDeletingMarcaModelo(false)
    }
  }

  const resetSeguradoraForm = () => {
    setSeguradoraControle('')
    setSeguradoraLista('')
    setSeguradoraControleError('')
    setSeguradoraListaError('')
    setEditingSeguradoraCodigo(null)
    setSeguradoraFormMode('create')
  }

  const handleStartInsertSeguradora = () => {
    resetSeguradoraForm()
    setSeguradoraFormMode('create')
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage('')
    setIsSeguradoraFormVisible(true)
  }

  const handleFilterSeguradoraSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSeguradoraPage(1)
    setSeguradoraStatusMessage('Aplicando filtro de seguradoras...')
    setSeguradoraStatusTone('idle')
  }

  const handleClearSeguradoraFilter = () => {
    setSeguradoraSearch('')
    setSeguradoraPage(1)
  }

  const handleSortSeguradora = (field: SeguradoraSortField) => {
    setSeguradoraPage(1)
    setSeguradoraSortBy((currentField) => {
      if (currentField === field) {
        setSeguradoraSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setSeguradoraSortDirection('asc')
      return field
    })
  }

  const getSeguradoraSortIndicator = (field: SeguradoraSortField) => {
    if (seguradoraSortBy !== field) {
      return '↕'
    }

    return seguradoraSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleStartEditSeguradora = (item: SeguradoraItem) => {
    setEditingSeguradoraCodigo(item.codigo)
    setSeguradoraFormMode('edit')
    setSeguradoraControle(item.controle)
    setSeguradoraLista(item.descricao)
    setSeguradoraControleError('')
    setSeguradoraListaError('')
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsSeguradoraFormVisible(true)
  }

  const handleStartViewSeguradora = (item: SeguradoraItem) => {
    setEditingSeguradoraCodigo(item.codigo)
    setSeguradoraFormMode('view')
    setSeguradoraControle(item.controle)
    setSeguradoraLista(item.descricao)
    setSeguradoraControleError('')
    setSeguradoraListaError('')
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsSeguradoraFormVisible(true)
  }

  const handleCancelSeguradoraForm = () => {
    resetSeguradoraForm()
    setIsSeguradoraFormVisible(false)
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage('')
  }

  useEffect(() => {
    const hasOpenManagementModal = isDreFormVisible
      || isModalidadeFormVisible
      || isTipoBancadaFormVisible
      || isTitularFormVisible
      || isMarcaModeloFormVisible
      || isSeguradoraFormVisible
      || isDashboardDrillDownVisible
      || isDashboardOsPopupVisible

    if (!hasOpenManagementModal) {
      document.body.classList.remove('management-modal-open')
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      if (isDreFormVisible && !isSavingDre) {
        handleCancelDreForm()
        return
      }

      if (isModalidadeFormVisible && !isSavingModalidade) {
        handleCancelModalidadeForm()
        return
      }

      if (isTipoBancadaFormVisible && !isSavingTipoBancada) {
        handleCancelTipoBancadaForm()
        return
      }

      if (isTitularFormVisible && !isSavingTitular) {
        handleCancelTitularForm()
        return
      }

      if (isMarcaModeloFormVisible && !isSavingMarcaModelo) {
        handleCancelMarcaModeloForm()
        return
      }

      if (isSeguradoraFormVisible && !isSavingSeguradora) {
        handleCancelSeguradoraForm()
        return
      }

      if (isDashboardDrillDownVisible) {
        handleCloseDashboardDrillDown()
        return
      }

      if (isDashboardOsPopupVisible) {
        handleCloseDashboardOsPopup()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    handleCancelDreForm,
    handleCancelMarcaModeloForm,
    handleCancelModalidadeForm,
    handleCancelSeguradoraForm,
    handleCancelTipoBancadaForm,
    handleCancelTitularForm,
    handleCloseDashboardDrillDown,
    handleCloseDashboardOsPopup,
    isDashboardDrillDownVisible,
    isDashboardOsPopupVisible,
    isDreFormVisible,
    isMarcaModeloFormVisible,
    isModalidadeFormVisible,
    isTipoBancadaFormVisible,
    isSavingDre,
    isSavingMarcaModelo,
    isSavingModalidade,
    isSavingSeguradora,
    isSavingTipoBancada,
    isSavingTitular,
    isSeguradoraFormVisible,
    isTitularFormVisible,
  ])

  const handleCreateSeguradora = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (seguradoraFormMode === 'view') {
      setSeguradoraStatusTone('idle')
      setSeguradoraStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const editingCodigo = editingSeguradoraCodigo
    const normalizedControle = seguradoraControle.trim()
    const normalizedLista = seguradoraLista.trim()
    let hasError = false

    setSeguradoraControleError('')
    setSeguradoraListaError('')

    if (!normalizedControle) {
      setSeguradoraControleError('Controle e obrigatorio.')
      hasError = true
    }

    if (!normalizedLista) {
      setSeguradoraListaError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setSeguradoraStatusTone('error')
      setSeguradoraStatusMessage('Corrija os campos de seguradora para continuar.')
      return
    }

    setIsSavingSeguradora(true)
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage(editingCodigo ? 'Alterando registro de seguradora...' : 'Gravando registro de seguradora...')

    try {
      const savedItem = editingCodigo
        ? await updateSeguradoraItem(editingCodigo, {
            controle: normalizedControle,
            descricao: normalizedLista,
          })
        : await createSeguradoraItem({
            controle: normalizedControle,
            descricao: normalizedLista,
          })

      void savedItem
      resetSeguradoraForm()
      setIsSeguradoraFormVisible(false)
      setSeguradoraStatusTone('success')
      setSeguradoraStatusMessage(editingCodigo ? 'Registro de seguradora alterado com sucesso.' : 'Registro de seguradora cadastrado com sucesso.')
      await loadSeguradoraItems(editingCodigo ? seguradoraPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro de seguradora.'

      setSeguradoraStatusTone('error')
      setSeguradoraStatusMessage(message)
    } finally {
      setIsSavingSeguradora(false)
    }
  }

  const handleDeleteSeguradora = async (item: SeguradoraItem) => {
    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingSeguradora(true)
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteSeguradoraItem(item.codigo)
      setSeguradoraItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingSeguradoraCodigo === item.codigo) {
        resetSeguradoraForm()
        setIsSeguradoraFormVisible(false)
      }

      setSeguradoraStatusTone('success')
      setSeguradoraStatusMessage('Registro de seguradora excluido com sucesso.')
      const nextPage = seguradoraItems.length === 1 && seguradoraPage > 1 ? seguradoraPage - 1 : seguradoraPage
      await loadSeguradoraItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro de seguradora.'

      setSeguradoraStatusTone('error')
      setSeguradoraStatusMessage(message)
    } finally {
      setIsDeletingSeguradora(false)
    }
  }

  useEffect(() => {
    const nextState = getDefaultCollapsedMenuGroups()

    for (const groupName of getExpandedGroupsForView(activeView)) {
      nextState[groupName] = false
    }

    setCollapsedMenuGroups(nextState)
  }, [activeView])

  if (!session) {
    return (
      <main className="login-page">
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-copy">
            <p className="login-kicker">TEG Financ</p>
            {environmentName ? <p className="environment-pill environment-pill-login">{environmentName}</p> : null}
            <h1 id="login-title">Acesse o painel administrativo</h1>
            <p className="login-description">
              Informe email e senha para validar o acesso. Quando a autenticacao
              for aprovada, a aplicacao abre esta area administrativa.
            </p>
          </div>

          <form className="login-card" onSubmit={handleSubmit} noValidate>
            <label className="field-group" htmlFor="email">
              <span>Email</span>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError ? (
                <strong id="email-error" className="field-error">
                  {emailError}
                </strong>
              ) : null}
            </label>

            <label className="field-group" htmlFor="password">
              <span>Senha</span>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              {passwordError ? (
                <strong id="password-error" className="field-error">
                  {passwordError}
                </strong>
              ) : null}
            </label>

            <div className="button-row">
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancel}
              >
                Cancelar
              </button>
            </div>

            <p className={`status-message status-${statusTone}`} aria-live="polite">
              {statusMessage}
            </p>

            <p className="auth-hint">
              Endpoint configurado por <strong>VITE_AUTH_URL</strong>.
            </p>
          </form>
        </section>
      </main>
    )
  }

  const canGoToPreviousDrePage = drePage > 1
  const canGoToNextDrePage = drePage < dreTotalPages
  const canGoToPreviousModalidadePage = modalidadePage > 1
  const canGoToNextModalidadePage = modalidadePage < modalidadeTotalPages
  const canGoToPreviousCondicaoPage = condicaoPage > 1
  const canGoToNextCondicaoPage = condicaoPage < condicaoTotalPages
  const canGoToPreviousTipoBancadaPage = tipoBancadaPage > 1
  const canGoToNextTipoBancadaPage = tipoBancadaPage < tipoBancadaTotalPages
  const canGoToPreviousTipoPgtoPage = tipoPgtoPage > 1
  const canGoToNextTipoPgtoPage = tipoPgtoPage < tipoPgtoTotalPages
  const canGoToPreviousModalBancadaTpPagtoCondicaoPage = modalBancadaTpPagtoCondicaoPage > 1
  const canGoToNextModalBancadaTpPagtoCondicaoPage = modalBancadaTpPagtoCondicaoPage < modalBancadaTpPagtoCondicaoTotalPages
  const canGoToPreviousModalBancadaTpPagtoCondicaoValorPage = modalBancadaTpPagtoCondicaoValorPage > 1
  const canGoToNextModalBancadaTpPagtoCondicaoValorPage = modalBancadaTpPagtoCondicaoValorPage < modalBancadaTpPagtoCondicaoValorTotalPages
  const canGoToPreviousKmValorPage = kmValorPage > 1
  const canGoToNextKmValorPage = kmValorPage < kmValorTotalPages
  const canGoToPreviousContinuaValorPage = continuaValorPage > 1
  const canGoToNextContinuaValorPage = continuaValorPage < continuaValorTotalPages
  const canGoToPreviousParametroVeiculoPage = parametroVeiculoPage > 1
  const canGoToNextParametroVeiculoPage = parametroVeiculoPage < parametroVeiculoTotalPages
  const canGoToPreviousTitularPage = titularPage > 1
  const canGoToNextTitularPage = titularPage < titularTotalPages
  const canGoToPreviousMarcaModeloPage = marcaModeloPage > 1
  const canGoToNextMarcaModeloPage = marcaModeloPage < marcaModeloTotalPages
  const canGoToPreviousSeguradoraPage = seguradoraPage > 1
  const canGoToNextSeguradoraPage = seguradoraPage < seguradoraTotalPages
  const dashboardModalidades = dashboardData?.modalidades ?? []
  const dashboardRows = dashboardData?.rows ?? []
  const dashboardBancadaRows = dashboardBancadaData?.rows ?? []
  const dashboardBancadaLayout = dashboardBancadaData ? getDashboardBancadaLayout(dashboardBancadaData) : null
  const dashboardBancadaModalidades = dashboardBancadaLayout?.modalidades ?? []
  const dashboardBancadaMatrixRows = dashboardBancadaLayout?.matrixRows ?? []
  const dashboardBancadaTotalsByModalidade = dashboardBancadaLayout?.totalsByModalidade ?? {}
  const dashboardBancadaVisibleTiposByModalidade = dashboardBancadaLayout?.visibleTiposByModalidade ?? {}
  const normalizedDashboardDrillDownSearch = normalizeDashboardDrillDownSearchValue(deferredDashboardDrillDownSearch)
  const filteredDashboardDrillDownItems = (dashboardDrillDownData?.items ?? []).filter((item) => {
    if (!normalizedDashboardDrillDownSearch) {
      return true
    }

    const searchableValue = normalizeDashboardDrillDownSearchValue([
      item.codigo,
      item.termoAdesao,
      item.numOs,
      item.revisao,
      item.osConcat,
      item.credenciado,
      item.cnpjCpf,
      item.tipoPessoa,
      item.condutor,
      item.cpfCondutor,
      item.crm,
      item.veiculoPlacas,
      item.veiculoTipoDeBancada,
      item.situacao,
      item.modalidadeDescricao,
    ].join(' '))

    return searchableValue.includes(normalizedDashboardDrillDownSearch)
  })

  const handleOpenDashboardDrillDown = async ({
    dreCodigo,
    dreDescricao,
    modalidadeDescricao,
    tipoDeBancada,
    total,
  }: DashboardDrillDownContext) => {
    const requestedMonth = dashboardData?.requestedMonth ?? dashboardBancadaData?.requestedMonth ?? dashboardMonth

    if (!requestedMonth || total <= 0) {
      return
    }

    setIsDashboardDrillDownVisible(true)
    setIsLoadingDashboardDrillDown(true)
    setDashboardDrillDownContext({ dreCodigo, dreDescricao, modalidadeDescricao, tipoDeBancada, total })
    setDashboardDrillDownData(null)
    setDashboardDrillDownSearch('')
    setDashboardDrillDownStatusMessage('Carregando Ordens de Servico da celula selecionada...')

    try {
      const result = await getOrdemServicoDashboardAtivosDetalhes({
        month: requestedMonth,
        dreCodigo,
        modalidade: modalidadeDescricao || undefined,
        tipoDeBancada: tipoDeBancada || undefined,
      })

      setDashboardDrillDownData(result)
      setDashboardDrillDownStatusMessage(result.items.length ? '' : 'Nenhuma OrdemServico encontrada para a celula selecionada.')
    } catch (error) {
      setDashboardDrillDownStatusMessage(error instanceof Error ? error.message : 'Falha ao carregar o detalhe do dashboard.')
    } finally {
      setIsLoadingDashboardDrillDown(false)
    }
  }

  const renderDashboardValueButton = ({
    total,
    dreCodigo,
    dreDescricao,
    modalidadeDescricao,
    tipoDeBancada,
  }: DashboardDrillDownContext) => (
    <button
      type="button"
      className="dashboard-cell-button"
      onClick={() => {
        void handleOpenDashboardDrillDown({ total, dreCodigo, dreDescricao, modalidadeDescricao, tipoDeBancada })
      }}
      disabled={total <= 0}
      aria-label={tipoDeBancada
        ? `Abrir detalhe de ${total} ordens de servico em ${dreCodigo} - ${modalidadeDescricao} - ${tipoDeBancada}`
        : modalidadeDescricao
          ? `Abrir detalhe de ${total} ordens de servico em ${dreCodigo} - ${modalidadeDescricao}`
          : `Abrir detalhe de ${total} ordens de servico em ${dreCodigo}`}
    >
      {total}
    </button>
  )

  const handleOpenDashboardOsPopup = (codigo: string) => {
    const normalizedCodigo = codigo.trim()

    if (!normalizedCodigo) {
      return
    }

    const params = new URLSearchParams({
      popupMode: 'dashboard-ordem-servico',
      codigo: normalizedCodigo,
      mode: 'view',
    })

    setDashboardOsPopupUrl(`/src/ordemServico.html?${params.toString()}`)
    setIsDashboardOsPopupVisible(true)
  }

  const handleDashboardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadDashboardAtivos(dashboardMonth)
  }

  const handleExportDashboardResumoExcel = () => {
    if (!dashboardData) {
      return
    }

    downloadTextFile(
      buildDashboardReportMarkup(dashboardData),
      `dashboard-ordem-servico-${dashboardData.requestedMonth}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
    )
  }

  const handlePrintDashboardResumo = () => {
    if (!dashboardData) {
      return
    }

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      setDashboardStatusTone('error')
      setDashboardStatusMessage('Nao foi possivel abrir a janela de impressao.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(buildDashboardReportMarkup(dashboardData, { autoPrint: true }))
    printWindow.document.close()
  }

  const handleExportDashboardBancadaExcel = () => {
    if (!dashboardBancadaData) {
      return
    }

    downloadTextFile(
      buildDashboardBancadaReportMarkup(dashboardBancadaData),
      `dashboard-ordem-servico-bancada-${dashboardBancadaData.requestedMonth}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
    )
  }

  const handlePrintDashboardBancada = () => {
    if (!dashboardBancadaData) {
      return
    }

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      setDashboardStatusTone('error')
      setDashboardStatusMessage('Nao foi possivel abrir a janela de impressao.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(buildDashboardBancadaReportMarkup(dashboardBancadaData, { autoPrint: true }))
    printWindow.document.close()
  }

  const toggleMenuGroup = (groupName: CollapsedMenuGroup) => {
    setCollapsedMenuGroups((current) => ({
      ...current,
      [groupName]: !current[groupName],
    }))
  }

  const handleSidebarMouseEnter = () => {
    isSidebarHoveredRef.current = true
    clearSidebarAutoHideTimeout()
    setIsSidebarVisible(true)
  }

  const handleSidebarMouseLeave = () => {
    isSidebarHoveredRef.current = false
    scheduleSidebarAutoHide()
  }

  const handleSidebarHoverZoneEnter = () => {
    setIsSidebarVisible(true)
    scheduleSidebarAutoHide()
  }

  const toggleSidebar = () => {
    if (isSidebarVisible) {
      isSidebarHoveredRef.current = false
      clearSidebarAutoHideTimeout()
      setIsSidebarVisible(false)
      return
    }

    setIsSidebarVisible(true)
    scheduleSidebarAutoHide()
  }

  const handleContentPanelClick = (event: MouseEvent<HTMLElement>) => {
    if (!isSidebarVisible) {
      return
    }

    const target = event.target instanceof HTMLElement ? event.target : null

    if (target?.closest('.management-modal-shell, input, select, textarea, button, a, label')) {
      return
    }

    isSidebarHoveredRef.current = false
    clearSidebarAutoHideTimeout()
    setIsSidebarVisible(false)
  }

  return (
    <div className="app-layout">
      <header className={`navbar ${isSidebarVisible ? '' : 'navbar-hidden'}`}>
        <button 
          type="button" 
          className="navbar-toggle" 
          onClick={toggleSidebar}
          aria-label={isSidebarVisible ? 'Ocultar menu lateral' : 'Mostrar menu lateral'}
        >
          {isSidebarVisible ? '☰' : '☰'}
        </button>
        <h1 className="navbar-title" onClick={() => setActiveView('inicio')} style={{ cursor: 'pointer' }}>
          Sistema TEG
        </h1>
      </header>
      
      <main className={`dashboard-page ${isSidebarVisible ? '' : 'dashboard-page--sidebar-hidden'}`}>
        {!isSidebarVisible ? (
          <button
            type="button"
            className="sidebar-hover-zone"
            onMouseEnter={handleSidebarHoverZoneEnter}
            onFocus={handleSidebarHoverZoneEnter}
            onClick={handleSidebarHoverZoneEnter}
            aria-label="Mostrar menu lateral"
          >
            <span className="sidebar-hover-zone-label" aria-hidden="true">
              <span>M</span>
              <span>E</span>
              <span>N</span>
              <span>U</span>
              <span className="sidebar-hover-zone-gap">&nbsp;</span>
              <span>T</span>
              <span>E</span>
              <span>G</span>
            </span>
          </button>
        ) : null}
        {isSidebarVisible && (
          <aside
            className="sidebar-menu"
            aria-label="Menu principal"
            onMouseEnter={handleSidebarMouseEnter}
            onMouseLeave={handleSidebarMouseLeave}
          >
            <div>
              <p className="sidebar-brand">TEG Financ</p>
              {environmentName ? <p className="environment-pill environment-pill-sidebar">{environmentName}</p> : null}
              <h1 className="sidebar-title">Menu TEG</h1>
            </div>

        <nav>
          <ul className="menu-list">
            <li
              className={`menu-item ${activeView === 'inicio' ? 'menu-item-active' : ''}`}
              onClick={() => setActiveView('inicio')}
            >
              Dashboard
            </li>
            <li className="menu-group">
              <button
                type="button"
                className="menu-item menu-item-static menu-item-toggle"
                onClick={() => toggleMenuGroup('operacional')}
                aria-expanded={!collapsedMenuGroups.operacional}
              >
                <span>Operacional</span>
                <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.operacional ? '▸' : '▾'}</span>
              </button>
              <ul className={`menu-sublist ${collapsedMenuGroups.operacional ? 'menu-sublist-hidden' : ''}`}>
                <li
                  className={`menu-subitem ${activeView === 'titular' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('titular')}
                >
                  Titular do CRM
                </li>
                <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'condutor' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('condutor')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.condutor}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('condutor')
                      }
                    }}
                  >
                    <span
                      className="menu-subitem-label"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView('condutor')
                      }}
                    >
                      Condutor
                    </span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.condutor ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.condutor ? 'menu-sublist-hidden' : ''}`}>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'vinculoCondutor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('vinculoCondutor')}
                    >
                      Vinculo Condutor
                    </li>
                  </ul>
                </li>
                <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'monitor' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('monitor')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.monitor}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('monitor')
                      }
                    }}
                  >
                    <span
                      className="menu-subitem-label"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView('monitor')
                      }}
                    >
                      Monitor
                    </span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.monitor ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.monitor ? 'menu-sublist-hidden' : ''}`}>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'vinculoMonitor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('vinculoMonitor')}
                    >
                      Vinculo Monitor
                    </li>
                  </ul>
                </li>
                <li
                  className={`menu-subitem ${activeView === 'credenciada' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('credenciada')}
                >
                  Credenciada
                </li>
                <li
                  className={`menu-subitem ${activeView === 'credenciamentoTermo' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('credenciamentoTermo')}
                >
                  Termo
                </li>
                <li
                  className={`menu-subitem ${activeView === 'ordemServico' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('ordemServico')}
                >
                  OrdemServico
                </li>
                <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'veiculo' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('veiculo')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.veiculo}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('veiculo')
                      }
                    }}
                  >
                    <span
                      className="menu-subitem-label"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView('veiculo')
                      }}
                    >
                      Veiculo
                    </span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.veiculo ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.veiculo ? 'menu-sublist-hidden' : ''}`}>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'veiculoHistorico' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('veiculoHistorico')}
                    >
                      Historico Veiculo
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
            <li className="menu-group">
              <button
                type="button"
                className="menu-item menu-item-static menu-item-toggle"
                onClick={() => toggleMenuGroup('cadastros')}
                aria-expanded={!collapsedMenuGroups.cadastros}
              >
                <span>Cadastros</span>
                <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.cadastros ? '▸' : '▾'}</span>
              </button>
              <ul className={`menu-sublist ${collapsedMenuGroups.cadastros ? 'menu-sublist-hidden' : ''}`}>
                <li className="menu-group menu-subgroup">
                  <button
                    type="button"
                    className="menu-subitem menu-item-static menu-item-toggle"
                    onClick={() => toggleMenuGroup('cadastrosOperacional')}
                    aria-expanded={!collapsedMenuGroups.cadastrosOperacional}
                  >
                    <span>Operacional</span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.cadastrosOperacional ? '▸' : '▾'}</span>
                  </button>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.cadastrosOperacional ? 'menu-sublist-hidden' : ''}`}>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'dre' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('dre')}
                    >
                      DRE
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'modalidade' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('modalidade')}
                    >
                      Modalidade
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'tipoBancada' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('tipoBancada')}
                    >
                      Tipo de Bancada
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'marcaModelo' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('marcaModelo')}
                    >
                      Marca/Modelo
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'seguradora' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('seguradora')}
                    >
                      Seguradoras
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'troca' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('troca')}
                    >
                      Tipo de Troca
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'emissaoDocumentoParametro' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('emissaoDocumentoParametro')}
                    >
                      Param. Emissao
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'cep' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('cep')}
                    >
                      CEP
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'smoke' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('smoke')}
                    >
                      Smoke Test
                    </li>
                  </ul>
                </li>
                <li className="menu-group menu-subgroup">
                  <button
                    type="button"
                    className="menu-subitem menu-item-static menu-item-toggle"
                    onClick={() => toggleMenuGroup('cadastrosFinanceiro')}
                    aria-expanded={!collapsedMenuGroups.cadastrosFinanceiro}
                  >
                    <span>Financeiro</span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.cadastrosFinanceiro ? '▸' : '▾'}</span>
                  </button>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.cadastrosFinanceiro ? 'menu-sublist-hidden' : ''}`}>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'condicao' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('condicao')}
                    >
                      Condicao
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'modalBancadaTpPagtoCondicao' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('modalBancadaTpPagtoCondicao')}
                    >
                      Modalidade x Bancada x Pagamento x Condicao
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'modalBancadaTpPagtoCondicaoValor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('modalBancadaTpPagtoCondicaoValor')}
                    >
                      Modalidade x Bancada x Pagamento x Condicao Valor
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'kmValor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('kmValor')}
                    >
                      Km_Valor
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'continuaValor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('continuaValor')}
                    >
                      Continua_Valor
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'parametroVeiculo' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('parametroVeiculo')}
                    >
                      Parametro Pgto Veiculo
                    </li>
                    <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'tipoPgto' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('tipoPgto')}
                    >
                      Tipo de Pagamento
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
            <li className="menu-group">
              <div
                className={`menu-item menu-item-toggle ${activeView === 'acesso' ? 'menu-item-active' : ''}`}
                onClick={() => toggleMenuGroup('acesso')}
                role="button"
                aria-expanded={!collapsedMenuGroups.acesso}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleMenuGroup('acesso')
                  }
                }}
              >
                <span
                  className="menu-subitem-label"
                  onClick={(event) => {
                    event.stopPropagation()
                    setActiveView('acesso')
                  }}
                >
                  Controle de acesso
                </span>
                <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.acesso ? '▸' : '▾'}</span>
              </div>
              <ul className={`menu-sublist ${collapsedMenuGroups.acesso ? 'menu-sublist-hidden' : ''}`}>
                <li
                  className={`menu-subitem ${activeView === 'loginDre' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('loginDre')}
                >
                  Login x DRE
                </li>
              </ul>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <p>Usuario autenticado</p>
          <strong>{session.displayName}</strong>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>
        )}

      <section className="content-panel" aria-labelledby="content-title" onClickCapture={handleContentPanelClick}>
        {activeView === 'inicio' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Dashboard operacional</p>
              <h2 id="content-title">Ordens de Servico Ativas por Mes</h2>
              <p className="content-description">
                Consulte a quantidade de Ordens de Servico que ficaram ativas ao menos um dia no mes selecionado,
                agrupadas por DRE e modalidade.
              </p>
            </div>

            <div className="management-layout dashboard-layout">
              <div className="management-card dashboard-controls-card">
                <form className="dashboard-filter-form" onSubmit={handleDashboardSubmit}>
                  <label className="field-group dashboard-month-group" htmlFor="dashboard-month">
                    <span>Mes de referencia</span>
                    <input
                      id="dashboard-month"
                      type="month"
                      value={dashboardMonth}
                      onChange={(event) => setDashboardMonth(event.target.value)}
                      max={getCurrentMonthInputValue()}
                    />
                  </label>

                  <div className="dashboard-filter-actions">
                    <button type="submit" className="primary-button" disabled={isLoadingDashboard || !dashboardMonth}>
                      {isLoadingDashboard ? 'Atualizando...' : 'Atualizar painel'}
                    </button>
                  </div>
                </form>

                <p className={`status-message status-${dashboardStatusTone}`} aria-live="polite">
                  {dashboardStatusMessage}
                </p>
              </div>

              <div className="dashboard-summary-grid">
                <article
                  className="dashboard-summary-card clickable dashboard-summary-card--positive"
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenTermosGrid}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenTermosGrid()
                    }
                  }}
                >
                  <span className="dashboard-summary-label">Termos ativos</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--positive">{termoAtivosCount}</strong>
                </article>
                <article
                  className="dashboard-summary-card clickable dashboard-summary-card--negative"
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenTermosGrid}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenTermosGrid()
                    }
                  }}
                >
                  <span className="dashboard-summary-label">Termos rescindidos</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--negative">{termoRescindidosCount}</strong>
                </article>
                <article
                  className="dashboard-summary-card clickable dashboard-summary-card--positive"
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenOrdemServicoGrid}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenOrdemServicoGrid()
                    }
                  }}
                >
                  <span className="dashboard-summary-label">OS ativas</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--positive">{dashboardData?.totals.totalOverall ?? 0}</strong>
                </article>
                <article
                  className="dashboard-summary-card clickable dashboard-summary-card--negative"
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenOrdemServicoGrid}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenOrdemServicoGrid()
                    }
                  }}
                >
                  <span className="dashboard-summary-label">OS canceladas</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--negative">{osCanceladasCount}</strong>
                </article>
                <article className="dashboard-summary-card dashboard-summary-card--positive">
                  <span className="dashboard-summary-label">DREs com atividade</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--positive">{dashboardData?.totals.totalDres ?? 0}</strong>
                </article>
                <article className="dashboard-summary-card dashboard-summary-card--positive">
                  <span className="dashboard-summary-label">Modalidades no mes</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--positive">{dashboardData?.totals.totalModalidades ?? 0}</strong>
                </article>
              </div>

              <div className="management-card dashboard-table-card">
                <button
                  type="button"
                  className="management-grid-header dashboard-grid-header dashboard-section-toggle"
                  onClick={() => setIsDashboardResumoExpanded((current) => !current)}
                  aria-expanded={isDashboardResumoExpanded}
                >
                  <h2>Distribuicao por DRE x Modalidade</h2>
                  <span className="dashboard-section-toggle-indicator" aria-hidden="true">{isDashboardResumoExpanded ? '▾' : '▸'}</span>
                </button>

                {isDashboardResumoExpanded ? (
                  <div className="dashboard-section-actions">
                    <button type="button" className="secondary-button" onClick={handleExportDashboardResumoExcel} disabled={isLoadingDashboard || !dashboardData}>
                      Exportar Excel
                    </button>
                    <button type="button" className="secondary-button" onClick={handlePrintDashboardResumo} disabled={isLoadingDashboard || !dashboardData}>
                      Imprimir relatorio
                    </button>
                  </div>
                ) : null}

                {isDashboardResumoExpanded && dashboardData ? (
                  <div className="dashboard-table-wrapper">
                    <table className="dre-table dashboard-table">
                      <thead>
                        <tr>
                          <th>DRE</th>
                          {dashboardModalidades.map((modalidade) => (
                            <th key={modalidade.descricao}>{modalidade.descricao}</th>
                          ))}
                          <th>Total Geral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardRows.map((row) => (
                          <tr key={row.dreCodigo}>
                            <td>
                              <div className="dashboard-dre-cell">
                                <strong>{row.dreCodigo}</strong>
                                <span>{row.dreDescricao}</span>
                              </div>
                            </td>
                            {dashboardModalidades.map((modalidade) => (
                              <td key={`${row.dreCodigo}-${modalidade.descricao}`} className="dashboard-numeric-cell">
                                {renderDashboardValueButton({
                                  total: row.countsByModalidade[modalidade.descricao] ?? 0,
                                  dreCodigo: row.dreCodigo,
                                  dreDescricao: row.dreDescricao,
                                  modalidadeDescricao: modalidade.descricao,
                                })}
                              </td>
                            ))}
                            <td className="dashboard-total-cell">
                              {renderDashboardValueButton({
                                total: row.totalGeral,
                                dreCodigo: row.dreCodigo,
                                dreDescricao: row.dreDescricao,
                                modalidadeDescricao: '',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>Total</th>
                          {dashboardModalidades.map((modalidade) => (
                            <th key={`total-${modalidade.descricao}`} className="dashboard-numeric-cell">
                              {modalidade.total}
                            </th>
                          ))}
                          <th className="dashboard-total-cell">{dashboardData.totals.totalOverall}</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : null}

                {isDashboardResumoExpanded && !isLoadingDashboard && dashboardData && dashboardRows.length === 0 ? (
                  <p className="management-empty-state">Nenhuma OrdemServico ativa encontrada para o mes selecionado.</p>
                ) : null}

                {isDashboardResumoExpanded && dashboardData ? (
                  <div className="dashboard-person-summary">
                    <div className="dashboard-person-summary-table">
                      <div className="dashboard-person-summary-row">
                        <span>PESSOA FISICA</span>
                        <strong>{dashboardData.personTypeTotals.pessoaFisica}</strong>
                      </div>
                      <div className="dashboard-person-summary-row">
                        <span>PESSOA JURIDICA</span>
                        <strong>{dashboardData.personTypeTotals.pessoaJuridica}</strong>
                      </div>
                      <div className="dashboard-person-summary-row">
                        <span>COOPERATIVA</span>
                        <strong>{dashboardData.personTypeTotals.cooperativa}</strong>
                      </div>
                    </div>

                    <div className="dashboard-generated-at">
                      <span>Data da geracao</span>
                      <strong>{formatDashboardGeneratedAt(dashboardData.generatedAt)}</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="management-card dashboard-table-card">
                <button
                  type="button"
                  className="management-grid-header dashboard-grid-header dashboard-section-toggle"
                  onClick={() => setIsDashboardBancadaExpanded((current) => !current)}
                  aria-expanded={isDashboardBancadaExpanded}
                >
                  <h2>DRE x Modalidade x Tipo de Bancada</h2>
                  <span className="dashboard-section-toggle-indicator" aria-hidden="true">{isDashboardBancadaExpanded ? '▾' : '▸'}</span>
                </button>

                {isDashboardBancadaExpanded ? (
                  <div className="dashboard-section-actions">
                    <button type="button" className="secondary-button" onClick={handleExportDashboardBancadaExcel} disabled={isLoadingDashboard || !dashboardBancadaData}>
                      Exportar Excel
                    </button>
                    <button type="button" className="secondary-button" onClick={handlePrintDashboardBancada} disabled={isLoadingDashboard || !dashboardBancadaData}>
                      Imprimir relatorio
                    </button>
                  </div>
                ) : null}

                {isDashboardBancadaExpanded && dashboardBancadaData ? (
                  <div className="dashboard-table-wrapper">
                    <table className="dre-table dashboard-table dashboard-bancada-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>DRE</th>
                          {dashboardBancadaModalidades.map((modalidadeDescricao) => (
                            <th
                              key={modalidadeDescricao}
                              colSpan={dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao]?.length ?? 0}
                              className="dashboard-bancada-group-header dashboard-bancada-group-divider"
                            >
                              {modalidadeDescricao}
                            </th>
                          ))}
                          <th rowSpan={2}>Total Geral</th>
                        </tr>
                        <tr>
                          {dashboardBancadaModalidades.map((modalidadeDescricao) => (
                            (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).map((tipoBancadaDescricao) => (
                              <th
                                key={`${modalidadeDescricao}-${tipoBancadaDescricao}`}
                                className={`dashboard-bancada-subheader ${tipoBancadaDescricao === (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).at(-1) ? 'dashboard-bancada-group-divider' : ''}`}
                              >
                                {tipoBancadaDescricao}
                              </th>
                            ))
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardBancadaMatrixRows.map((row) => (
                          <tr key={row.dreCodigo}>
                            <td>
                              <div className="dashboard-bancada-main-cell">
                                <strong>{row.dreCodigo}</strong>
                                <span>{row.dreDescricao}</span>
                              </div>
                            </td>
                            {dashboardBancadaModalidades.map((modalidadeDescricao) => (
                              (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).map((tipoBancadaDescricao) => (
                                <td
                                  key={`${row.dreCodigo}-${modalidadeDescricao}-${tipoBancadaDescricao}`}
                                  className={`dashboard-numeric-cell ${tipoBancadaDescricao === (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).at(-1) ? 'dashboard-bancada-group-divider' : ''}`}
                                >
                                  {renderDashboardValueButton({
                                    total: row.countsByModalidadeAndTipo[modalidadeDescricao]?.[tipoBancadaDescricao] ?? 0,
                                    dreCodigo: row.dreCodigo,
                                    dreDescricao: row.dreDescricao,
                                    modalidadeDescricao,
                                    tipoDeBancada: tipoBancadaDescricao,
                                  })}
                                </td>
                              ))
                            ))}
                            <td className="dashboard-total-cell">
                              {renderDashboardValueButton({
                                total: row.totalGeral,
                                dreCodigo: row.dreCodigo,
                                dreDescricao: row.dreDescricao,
                                modalidadeDescricao: '',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>Total</th>
                          {dashboardBancadaModalidades.map((modalidadeDescricao) => (
                            (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).map((tipoBancadaDescricao) => (
                              <th
                                key={`total-${modalidadeDescricao}-${tipoBancadaDescricao}`}
                                className={`dashboard-numeric-cell ${tipoBancadaDescricao === (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).at(-1) ? 'dashboard-bancada-group-divider' : ''}`}
                              >
                                {dashboardBancadaTotalsByModalidade[modalidadeDescricao]?.countsByTipoBancada[tipoBancadaDescricao] ?? 0}
                              </th>
                            ))
                          ))}
                          <th className="dashboard-total-cell">{dashboardBancadaData.totals.totalOverall}</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : null}

                {isDashboardBancadaExpanded && !isLoadingDashboard && dashboardBancadaData && dashboardBancadaRows.length === 0 ? (
                  <p className="management-empty-state">Nenhuma OrdemServico ativa com veiculo relacionado foi encontrada para o mes selecionado.</p>
                ) : null}

                {isDashboardBancadaExpanded && dashboardData ? (
                  <div className="dashboard-person-summary">
                    <div className="dashboard-person-summary-table">
                      <div className="dashboard-person-summary-row">
                        <span>PESSOA FISICA</span>
                        <strong>{dashboardData.personTypeTotals.pessoaFisica}</strong>
                      </div>
                      <div className="dashboard-person-summary-row">
                        <span>PESSOA JURIDICA</span>
                        <strong>{dashboardData.personTypeTotals.pessoaJuridica}</strong>
                      </div>
                      <div className="dashboard-person-summary-row">
                        <span>COOPERATIVA</span>
                        <strong>{dashboardData.personTypeTotals.cooperativa}</strong>
                      </div>
                    </div>

                    <div className="dashboard-generated-at">
                      <span>Data da geracao</span>
                      <strong>{formatDashboardGeneratedAt(dashboardData.generatedAt)}</strong>
                    </div>
                  </div>
                ) : null}
              </div>
              {isDashboardDrillDownVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      handleCloseDashboardDrillDown()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell dashboard-drilldown-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dashboard-drilldown-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="management-card management-modal-form-card dashboard-drilldown-card">
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Dashboard OrdemServico</p>
                          <h2 id="dashboard-drilldown-title">
                            {dashboardDrillDownContext
                              ? [
                                dashboardDrillDownContext.modalidadeDescricao || 'TOTAL GERAL',
                                dashboardDrillDownContext.dreCodigo,
                                dashboardDrillDownContext.tipoDeBancada || '',
                              ].filter(Boolean).join(' x ')
                              : 'Tipo de TEG x DRE'}
                          </h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCloseDashboardDrillDown}
                          aria-label="Fechar detalhe do dashboard"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {dashboardDrillDownContext
                          ? `${dashboardDrillDownContext.dreCodigo} - ${dashboardDrillDownContext.dreDescricao}${dashboardDrillDownContext.modalidadeDescricao ? ` | ${dashboardDrillDownContext.modalidadeDescricao}` : ' | Total Geral'}${dashboardDrillDownContext.tipoDeBancada ? ` | Bancada ${dashboardDrillDownContext.tipoDeBancada}` : ''}`
                          : 'Detalhamento das Ordens de Servico ativas.'}
                      </p>

                      <div className="dashboard-drilldown-toolbar">
                        <label className="field-group dashboard-drilldown-filter" htmlFor="dashboard-drilldown-search">
                          <span>Filtrar OS</span>
                          <input
                            id="dashboard-drilldown-search"
                            type="text"
                            placeholder="Buscar por OS, credenciada, condutor, CPF, CRM ou placa"
                            value={dashboardDrillDownSearch}
                            onChange={(event) => setDashboardDrillDownSearch(event.target.value)}
                            disabled={isLoadingDashboardDrillDown}
                          />
                        </label>

                        <div className="dashboard-drilldown-summary">
                          <strong>{filteredDashboardDrillDownItems.length}</strong>
                          <span>{filteredDashboardDrillDownItems.length === 1 ? 'registro visivel' : 'registros visiveis'}</span>
                        </div>
                      </div>

                      <p className={`status-message status-${dashboardDrillDownStatusMessage ? 'idle' : 'idle'}`} aria-live="polite">
                        {isLoadingDashboardDrillDown ? 'Carregando detalhe...' : dashboardDrillDownStatusMessage}
                      </p>

                      {!isLoadingDashboardDrillDown && dashboardDrillDownData ? (
                        <div className="dashboard-drilldown-table-wrapper">
                          <table className="dre-table dashboard-drilldown-table">
                            <thead>
                              <tr>
                                <th>OS</th>
                                <th>Credenciada</th>
                                <th>CRM / Placa</th>
                                <th className="dashboard-drilldown-actions-column">Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredDashboardDrillDownItems.map((item: OrdemServicoDashboardDetailItem) => (
                                <tr key={item.codigo}>
                                  <td>
                                    <div className="dashboard-drilldown-os-cell">
                                      <strong>{item.osConcat || `${item.termoAdesao}/${item.numOs}`}</strong>
                                      <span>Cod. {item.codigo}{item.revisao ? ` | Rev. ${item.revisao}` : ''}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="dashboard-drilldown-main-cell">
                                      <strong>{item.credenciado || 'Sem credenciada'}</strong>
                                      <span>{item.cnpjCpf || 'Sem CNPJ/CPF'}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="dashboard-drilldown-main-cell">
                                      <strong>{item.crm || '-'}</strong>
                                      <span>{item.veiculoPlacas || 'Sem placa'}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="secondary-button dashboard-open-os-button"
                                      onClick={() => handleOpenDashboardOsPopup(item.codigo)}
                                    >
                                      Abrir OS
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      {!isLoadingDashboardDrillDown && dashboardDrillDownData && filteredDashboardDrillDownItems.length === 0 ? (
                        <p className="management-empty-state">Nenhuma OrdemServico corresponde ao filtro informado.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {isDashboardOsPopupVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      handleCloseDashboardOsPopup()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell dashboard-os-popup-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dashboard-os-popup-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="management-card management-modal-form-card dashboard-os-popup-card">
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Dashboard OrdemServico</p>
                          <h2 id="dashboard-os-popup-title">Formulario de OS</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCloseDashboardOsPopup}
                          aria-label="Fechar formulario de OS"
                        >
                          X
                        </button>
                      </div>

                      {dashboardOsPopupUrl ? (
                        <div className="access-embed-card dashboard-os-popup-embed-card">
                          <iframe
                            className="access-embed-frame dashboard-os-popup-frame"
                            src={dashboardOsPopupUrl}
                            title="Formulario de OrdemServico"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : activeView === 'dre' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela DRE</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela DRE. O codigo e gerado
                automaticamente, a sigla deve ter 2 letras maiusculas e a descricao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertDre}
                  disabled={isSavingDre || isDeletingDre}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterDreSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, sigla ou descricao"
                    value={dreSearch}
                    onChange={(event) => setDreSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearDreFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isDreFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingDre) {
                      handleCancelDreForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dre-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateDre} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo</p>
                          <h2 id="dre-modal-title">DRE</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelDreForm}
                          disabled={isSavingDre}
                          aria-label="Fechar formulario de DRE"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {dreFormMode === 'view' ? 'Consulta de registro' : editingDreCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="dre-sigla">
                        <span>Sigla</span>
                        <input
                          id="dre-sigla"
                          name="sigla"
                          type="text"
                          value={dreSigla}
                          onChange={(event) => setDreSigla(normalizeDreSiglaInput(event.target.value))}
                          maxLength={2}
                          disabled={isSavingDre || dreFormMode === 'view'}
                          aria-invalid={Boolean(dreSiglaError)}
                        />
                        {dreSiglaError ? <strong className="field-error">{dreSiglaError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="dre-descricao">
                        <span>Descricao</span>
                        <input
                          id="dre-descricao"
                          name="descricao"
                          type="text"
                          value={dreDescricao}
                          onChange={(event) => setDreDescricao(event.target.value)}
                          disabled={isSavingDre || dreFormMode === 'view'}
                          aria-invalid={Boolean(dreDescricaoError)}
                        />
                        {dreDescricaoError ? <strong className="field-error">{dreDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${dreStatusTone}`} aria-live="polite">
                        {dreStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {dreFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingDre}>
                            {isSavingDre ? 'Salvando...' : editingDreCodigo ? 'Salvar alteracao' : 'Salvar DRE'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelDreForm} disabled={isSavingDre}>
                          {dreFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingDre ? 'Atualizando...' : `${dreTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortDre('codigo')}>
                            Codigo <span>{getSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          Sigla
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortDre('descricao')}>
                            Descricao <span>{getSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dreItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.sigla}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewDre(item)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditDre(item)}>
                                Alterar
                              </button>
                              <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteDre(item)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingDre && dreItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro da DRE encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${dreStatusTone}`} aria-live="polite">
                  {isDreFormVisible ? '' : dreStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDrePage(1)}
                    disabled={!canGoToPreviousDrePage || isLoadingDre}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDrePage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousDrePage || isLoadingDre}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {drePage} de {dreTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDrePage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextDrePage || isLoadingDre}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDrePage(dreTotalPages)}
                    disabled={!canGoToNextDrePage || isLoadingDre}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'modalidade' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Modalidade</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela Modalidade. O codigo e gerado
                automaticamente e a descricao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertModalidade}
                  disabled={isSavingModalidade || isDeletingModalidade}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterModalidadeSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo ou descricao"
                    value={modalidadeSearch}
                    onChange={(event) => setModalidadeSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearModalidadeFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isModalidadeFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingModalidade) {
                      handleCancelModalidadeForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modalidade-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateModalidade} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo</p>
                          <h2 id="modalidade-modal-title">MODALIDADE</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelModalidadeForm}
                          disabled={isSavingModalidade}
                          aria-label="Fechar formulario de modalidade"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {modalidadeFormMode === 'view' ? 'Consulta de registro' : editingModalidadeCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="modalidade-descricao">
                        <span>Descricao</span>
                        <input
                          id="modalidade-descricao"
                          name="descricao"
                          type="text"
                          value={modalidadeDescricao}
                          onChange={(event) => setModalidadeDescricao(event.target.value)}
                          disabled={isSavingModalidade || modalidadeFormMode === 'view'}
                          aria-invalid={Boolean(modalidadeDescricaoError)}
                        />
                        {modalidadeDescricaoError ? <strong className="field-error">{modalidadeDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${modalidadeStatusTone}`} aria-live="polite">
                        {modalidadeStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {modalidadeFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingModalidade}>
                            {isSavingModalidade ? 'Salvando...' : editingModalidadeCodigo ? 'Salvar alteracao' : 'Salvar Modalidade'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelModalidadeForm} disabled={isSavingModalidade}>
                          {modalidadeFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingModalidade ? 'Atualizando...' : `${modalidadeTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortModalidade('codigo')}>
                            Codigo <span>{getModalidadeSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortModalidade('descricao')}>
                            Descricao <span>{getModalidadeSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalidadeItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewModalidade(item)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditModalidade(item)}>
                                Alterar
                              </button>
                              <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteModalidade(item)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingModalidade && modalidadeItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de modalidade encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${modalidadeStatusTone}`} aria-live="polite">
                  {isModalidadeFormVisible ? '' : modalidadeStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalidadePage(1)}
                    disabled={!canGoToPreviousModalidadePage || isLoadingModalidade}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalidadePage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousModalidadePage || isLoadingModalidade}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {modalidadePage} de {modalidadeTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalidadePage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextModalidadePage || isLoadingModalidade}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalidadePage(modalidadeTotalPages)}
                    disabled={!canGoToNextModalidadePage || isLoadingModalidade}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'condicao' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Condicao</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela Condicao. O codigo e gerado
                automaticamente e os campos descricao, Qtde Ini e Qtde Fim sao obrigatorios.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertCondicao}
                  disabled={isSavingCondicao || isDeletingCondicao}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterCondicaoSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, descricao ou quantidade"
                    value={condicaoSearch}
                    onChange={(event) => setCondicaoSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearCondicaoFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isCondicaoFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingCondicao) {
                      handleCancelCondicaoForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="condicao-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateCondicao} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo</p>
                          <h2 id="condicao-modal-title">CONDICAO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelCondicaoForm}
                          disabled={isSavingCondicao}
                          aria-label="Fechar formulario de condicao"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {condicaoFormMode === 'view' ? 'Consulta de registro' : editingCondicaoCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="condicao-descricao">
                        <span>Descricao</span>
                        <input
                          id="condicao-descricao"
                          name="descricao"
                          type="text"
                          value={condicaoDescricao}
                          onChange={(event) => setCondicaoDescricao(event.target.value)}
                          disabled={isSavingCondicao || condicaoFormMode === 'view'}
                          aria-invalid={Boolean(condicaoDescricaoError)}
                        />
                        {condicaoDescricaoError ? <strong className="field-error">{condicaoDescricaoError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="condicao-qtde-ini">
                        <span>Qtde Ini</span>
                        <input
                          id="condicao-qtde-ini"
                          name="qtdeIni"
                          type="number"
                          min={0}
                          step={1}
                          value={condicaoQtdeIni}
                          onChange={(event) => setCondicaoQtdeIni(event.target.value)}
                          disabled={isSavingCondicao || condicaoFormMode === 'view'}
                          aria-invalid={Boolean(condicaoQtdeIniError)}
                        />
                        {condicaoQtdeIniError ? <strong className="field-error">{condicaoQtdeIniError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="condicao-qtde-fim">
                        <span>Qtde Fim</span>
                        <input
                          id="condicao-qtde-fim"
                          name="qtdeFim"
                          type="number"
                          min={0}
                          step={1}
                          value={condicaoQtdeFim}
                          onChange={(event) => setCondicaoQtdeFim(event.target.value)}
                          disabled={isSavingCondicao || condicaoFormMode === 'view'}
                          aria-invalid={Boolean(condicaoQtdeFimError)}
                        />
                        {condicaoQtdeFimError ? <strong className="field-error">{condicaoQtdeFimError}</strong> : null}
                      </label>

                      <p className={`status-message status-${condicaoStatusTone}`} aria-live="polite">
                        {condicaoStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {condicaoFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingCondicao}>
                            {isSavingCondicao ? 'Salvando...' : editingCondicaoCodigo ? 'Salvar alteracao' : 'Salvar Condicao'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelCondicaoForm} disabled={isSavingCondicao}>
                          {condicaoFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingCondicao ? 'Atualizando...' : `${condicaoTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortCondicao('codigo')}>
                            Codigo <span>{getCondicaoSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortCondicao('descricao')}>
                            Descricao <span>{getCondicaoSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortCondicao('qtdeIni')}>
                            Qtde Ini <span>{getCondicaoSortIndicator('qtdeIni')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortCondicao('qtdeFim')}>
                            Qtde Fim <span>{getCondicaoSortIndicator('qtdeFim')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {condicaoItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>{item.qtdeIni}</td>
                          <td>{item.qtdeFim}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewCondicao(item)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditCondicao(item)}>
                                Alterar
                              </button>
                              <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteCondicao(item)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingCondicao && condicaoItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de condicao encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${condicaoStatusTone}`} aria-live="polite">
                  {isCondicaoFormVisible ? '' : condicaoStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setCondicaoPage(1)}
                    disabled={!canGoToPreviousCondicaoPage || isLoadingCondicao}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setCondicaoPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousCondicaoPage || isLoadingCondicao}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {condicaoPage} de {condicaoTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setCondicaoPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextCondicaoPage || isLoadingCondicao}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setCondicaoPage(condicaoTotalPages)}
                    disabled={!canGoToNextCondicaoPage || isLoadingCondicao}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'tipoPgto' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tipo de Pagamento</h2>
              <p className="content-description">
                Cadastre e consulte os registros de Tipo de Pagamento no mesmo modelo da DRE.
                O codigo e gerado automaticamente e a descricao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertTipoPgto}
                  disabled={isSavingTipoPgto || isDeletingTipoPgto}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterTipoPgtoSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo ou descricao"
                    value={tipoPgtoSearch}
                    onChange={(event) => setTipoPgtoSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearTipoPgtoFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isTipoPgtoFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingTipoPgto) {
                      handleCancelTipoPgtoForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tipo-pgto-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateTipoPgto} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro</p>
                          <h2 id="tipo-pgto-modal-title">TIPO DE PAGAMENTO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelTipoPgtoForm}
                          disabled={isSavingTipoPgto}
                          aria-label="Fechar formulario de tipo de pagamento"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {tipoPgtoFormMode === 'view' ? 'Consulta de registro' : editingTipoPgtoCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="tipo-pgto-descricao">
                        <span>Descricao</span>
                        <input
                          id="tipo-pgto-descricao"
                          name="descricao"
                          type="text"
                          value={tipoPgtoDescricao}
                          onChange={(event) => setTipoPgtoDescricao(event.target.value)}
                          disabled={isSavingTipoPgto || tipoPgtoFormMode === 'view'}
                          aria-invalid={Boolean(tipoPgtoDescricaoError)}
                        />
                        {tipoPgtoDescricaoError ? <strong className="field-error">{tipoPgtoDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${tipoPgtoStatusTone}`} aria-live="polite">
                        {tipoPgtoStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {tipoPgtoFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingTipoPgto}>
                            {isSavingTipoPgto ? 'Salvando...' : editingTipoPgtoCodigo ? 'Salvar alteracao' : 'Salvar Tipo de Pagamento'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelTipoPgtoForm} disabled={isSavingTipoPgto}>
                          {tipoPgtoFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingTipoPgto ? 'Atualizando...' : `${tipoPgtoTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoPgto('codigo')}>
                            Codigo <span>{getTipoPgtoSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoPgto('descricao')}>
                            Descricao <span>{getTipoPgtoSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipoPgtoItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewTipoPgto(item)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditTipoPgto(item)}>
                                Alterar
                              </button>
                              <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteTipoPgto(item)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingTipoPgto && tipoPgtoItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de tipo de pagamento encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${tipoPgtoStatusTone}`} aria-live="polite">
                  {isTipoPgtoFormVisible ? '' : tipoPgtoStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoPgtoPage(1)}
                    disabled={!canGoToPreviousTipoPgtoPage || isLoadingTipoPgto}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoPgtoPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousTipoPgtoPage || isLoadingTipoPgto}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {tipoPgtoPage} de {tipoPgtoTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoPgtoPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextTipoPgtoPage || isLoadingTipoPgto}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoPgtoPage(tipoPgtoTotalPages)}
                    disabled={!canGoToNextTipoPgtoPage || isLoadingTipoPgto}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'modalBancadaTpPagtoCondicao' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tabela Modalidade x Bancada x Pagamento x Condicao</h2>
              <p className="content-description">
                Relacione os registros de Modalidade x Tipo de Bancada com Tipo de Pagamento e Condicao.
                Os tres campos sao obrigatorios e a associacao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertModalBancadaTpPagtoCondicao}
                  disabled={isSavingModalBancadaTpPagtoCondicao || isDeletingModalBancadaTpPagtoCondicao || isLoadingModalBancadaTpPagtoCondicaoOptions}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterModalBancadaTpPagtoCondicaoSubmit}>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-filter-associacao">
                    <span>Modalidade x Tipo de Bancada</span>
                    <select
                      id="modal-bancada-tp-pagto-condicao-filter-associacao"
                      value={modalBancadaTpPagtoCondicaoFilterAssociationCodigo}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoFilterAssociationCodigo(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoItems || isLoadingModalBancadaTpPagtoCondicaoOptions}
                    >
                      <option value="">Todas</option>
                      {modalBancadaTpPagtoCondicaoAssociationOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.modalidadeDescricao} / {item.tipoBancadaDescricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-filter-tipo-pgto">
                    <span>Tipo de Pagamento</span>
                    <select
                      id="modal-bancada-tp-pagto-condicao-filter-tipo-pgto"
                      value={modalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoItems || isLoadingModalBancadaTpPagtoCondicaoOptions}
                    >
                      <option value="">Todos</option>
                      {modalBancadaTpPagtoCondicaoTipoPgtoOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-filter-condicao">
                    <span>Condicao</span>
                    <select
                      id="modal-bancada-tp-pagto-condicao-filter-condicao"
                      value={modalBancadaTpPagtoCondicaoFilterCondicaoCodigo}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoFilterCondicaoCodigo(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoItems || isLoadingModalBancadaTpPagtoCondicaoOptions}
                    >
                      <option value="">Todas</option>
                      {modalBancadaTpPagtoCondicaoCondicaoOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearModalBancadaTpPagtoCondicaoFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isModalBancadaTpPagtoCondicaoFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingModalBancadaTpPagtoCondicao) {
                      handleCancelModalBancadaTpPagtoCondicaoForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-bancada-tp-pagto-condicao-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateModalBancadaTpPagtoCondicao} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro</p>
                          <h2 id="modal-bancada-tp-pagto-condicao-modal-title">MODALIDADE X BANCADA X PAGAMENTO X CONDICAO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelModalBancadaTpPagtoCondicaoForm}
                          disabled={isSavingModalBancadaTpPagtoCondicao}
                          aria-label="Fechar formulario da associacao de modalidade, bancada, pagamento e condicao"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {modalBancadaTpPagtoCondicaoFormMode === 'view' ? 'Consulta de registro' : editingModalBancadaTpPagtoCondicaoCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-associacao">
                        <span>Modalidade x Tipo de Bancada</span>
                        <select
                          id="modal-bancada-tp-pagto-condicao-associacao"
                          value={modalBancadaTpPagtoCondicaoAssociationCodigo}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoAssociationCodigo(event.target.value)}
                          disabled={isLoadingModalBancadaTpPagtoCondicaoOptions || isSavingModalBancadaTpPagtoCondicao || modalBancadaTpPagtoCondicaoFormMode === 'view'}
                        >
                          <option value="">Selecione a associacao</option>
                          {modalBancadaTpPagtoCondicaoAssociationOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                                {item.modalidadeDescricao} / {item.tipoBancadaDescricao}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-tipo-pgto">
                        <span>Tipo de Pagamento</span>
                        <select
                          id="modal-bancada-tp-pagto-condicao-tipo-pgto"
                          value={modalBancadaTpPagtoCondicaoTipoPgtoCodigo}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoTipoPgtoCodigo(event.target.value)}
                          disabled={isLoadingModalBancadaTpPagtoCondicaoOptions || isSavingModalBancadaTpPagtoCondicao || modalBancadaTpPagtoCondicaoFormMode === 'view'}
                        >
                          <option value="">Selecione o tipo de pagamento</option>
                          {modalBancadaTpPagtoCondicaoTipoPgtoOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                                {item.descricao}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-condicao">
                        <span>Condicao</span>
                        <select
                          id="modal-bancada-tp-pagto-condicao-condicao"
                          value={modalBancadaTpPagtoCondicaoCondicaoCodigo}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoCondicaoCodigo(event.target.value)}
                          disabled={isLoadingModalBancadaTpPagtoCondicaoOptions || isSavingModalBancadaTpPagtoCondicao || modalBancadaTpPagtoCondicaoFormMode === 'view'}
                        >
                          <option value="">Selecione a condicao</option>
                          {modalBancadaTpPagtoCondicaoCondicaoOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                                {item.descricao}
                            </option>
                          ))}
                        </select>
                      </label>

                      <p className={`status-message status-${modalBancadaTpPagtoCondicaoStatusTone}`} aria-live="polite">
                        {modalBancadaTpPagtoCondicaoStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {modalBancadaTpPagtoCondicaoFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingModalBancadaTpPagtoCondicao || isLoadingModalBancadaTpPagtoCondicaoOptions}>
                            {isSavingModalBancadaTpPagtoCondicao ? 'Salvando...' : editingModalBancadaTpPagtoCondicaoCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelModalBancadaTpPagtoCondicaoForm} disabled={isSavingModalBancadaTpPagtoCondicao}>
                          {modalBancadaTpPagtoCondicaoFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingModalBancadaTpPagtoCondicaoItems ? 'Atualizando...' : `${modalBancadaTpPagtoCondicaoTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Modalidade</th>
                        <th>Tipo de Bancada</th>
                        <th>Tipo de Pagamento</th>
                        <th>Condicao</th>
                        <th>Faixa</th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalBancadaTpPagtoCondicaoItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.modalidadeDescricao}</td>
                          <td>{item.tipoBancadaDescricao}</td>
                          <td>{item.tipoPgtoDescricao}</td>
                          <td>{item.condicaoDescricao}</td>
                          <td>{item.condicaoQtdeIni} a {item.condicaoQtdeFim}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewModalBancadaTpPagtoCondicao(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditModalBancadaTpPagtoCondicao(item)}
                                disabled={isDeletingModalBancadaTpPagtoCondicao}
                              >
                                Alterar
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteModalBancadaTpPagtoCondicao(item)}
                                disabled={isDeletingModalBancadaTpPagtoCondicao}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingModalBancadaTpPagtoCondicaoItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingModalBancadaTpPagtoCondicaoItems && !modalBancadaTpPagtoCondicaoItems.length ? (
                    <p className="management-empty-state">Nenhum registro encontrado na associacao de modalidade, bancada, pagamento e condicao.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${modalBancadaTpPagtoCondicaoStatusTone}`} aria-live="polite">
                  {isModalBancadaTpPagtoCondicaoFormVisible ? '' : modalBancadaTpPagtoCondicaoStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoPage(1)}
                    disabled={!canGoToPreviousModalBancadaTpPagtoCondicaoPage || isLoadingModalBancadaTpPagtoCondicaoItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousModalBancadaTpPagtoCondicaoPage || isLoadingModalBancadaTpPagtoCondicaoItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {modalBancadaTpPagtoCondicaoPage} de {modalBancadaTpPagtoCondicaoTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextModalBancadaTpPagtoCondicaoPage || isLoadingModalBancadaTpPagtoCondicaoItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoPage(modalBancadaTpPagtoCondicaoTotalPages)}
                    disabled={!canGoToNextModalBancadaTpPagtoCondicaoPage || isLoadingModalBancadaTpPagtoCondicaoItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'modalBancadaTpPagtoCondicaoValor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tabela Modalidade x Bancada x Pagamento x Condicao Valor</h2>
              <p className="content-description">
                Cadastre os valores por data para a associacao de Modalidade x Bancada x Pagamento x Condicao.
                A combinacao entre associacao e data nao pode se repetir e o valor aceita zero.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertModalBancadaTpPagtoCondicaoValor}
                  disabled={isSavingModalBancadaTpPagtoCondicaoValor || isDeletingModalBancadaTpPagtoCondicaoValor || isLoadingModalBancadaTpPagtoCondicaoValorOptions}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterModalBancadaTpPagtoCondicaoValorSubmit}>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-filter-associacao">
                    <span>Associacao</span>
                    <select
                      id="modal-bancada-tp-pagto-condicao-valor-filter-associacao"
                      value={modalBancadaTpPagtoCondicaoValorFilterAssociationCodigo}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoValorItems || isLoadingModalBancadaTpPagtoCondicaoValorOptions}
                    >
                      <option value="">Todas</option>
                      {modalBancadaTpPagtoCondicaoValorOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {formatModalBancadaTpPagtoCondicaoLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-filter-data">
                    <span>Data</span>
                    <input
                      id="modal-bancada-tp-pagto-condicao-valor-filter-data"
                      type="date"
                      value={modalBancadaTpPagtoCondicaoValorFilterData}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoValorFilterData(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    />
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearModalBancadaTpPagtoCondicaoValorFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isModalBancadaTpPagtoCondicaoValorFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingModalBancadaTpPagtoCondicaoValor) {
                      handleCancelModalBancadaTpPagtoCondicaoValorForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-bancada-tp-pagto-condicao-valor-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateModalBancadaTpPagtoCondicaoValor} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro</p>
                          <h2 id="modal-bancada-tp-pagto-condicao-valor-modal-title">MODALIDADE X BANCADA X PAGAMENTO X CONDICAO VALOR</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelModalBancadaTpPagtoCondicaoValorForm}
                          disabled={isSavingModalBancadaTpPagtoCondicaoValor}
                          aria-label="Fechar formulario da associacao de modalidade, bancada, pagamento e condicao valor"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {modalBancadaTpPagtoCondicaoValorFormMode === 'view' ? 'Consulta de registro' : editingModalBancadaTpPagtoCondicaoValorCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-associacao">
                        <span>Associacao</span>
                        <select
                          id="modal-bancada-tp-pagto-condicao-valor-associacao"
                          value={modalBancadaTpPagtoCondicaoValorAssociationCodigo}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoValorAssociationCodigo(event.target.value)}
                          disabled={isLoadingModalBancadaTpPagtoCondicaoValorOptions || isSavingModalBancadaTpPagtoCondicaoValor || modalBancadaTpPagtoCondicaoValorFormMode === 'view'}
                        >
                          <option value="">Selecione a associacao</option>
                          {modalBancadaTpPagtoCondicaoValorOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {formatModalBancadaTpPagtoCondicaoLabel(item)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-data">
                        <span>Data</span>
                        <input
                          id="modal-bancada-tp-pagto-condicao-valor-data"
                          type="date"
                          value={modalBancadaTpPagtoCondicaoValorData}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoValorData(event.target.value)}
                          disabled={isSavingModalBancadaTpPagtoCondicaoValor || modalBancadaTpPagtoCondicaoValorFormMode === 'view'}
                        />
                      </label>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-valor">
                        <span>Valor</span>
                        <input
                          id="modal-bancada-tp-pagto-condicao-valor-valor"
                          type="number"
                          min="0"
                          step="0.01"
                          value={modalBancadaTpPagtoCondicaoValorValor}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoValorValor(event.target.value)}
                          disabled={isSavingModalBancadaTpPagtoCondicaoValor || modalBancadaTpPagtoCondicaoValorFormMode === 'view'}
                        />
                      </label>

                      <p className={`status-message status-${modalBancadaTpPagtoCondicaoValorStatusTone}`} aria-live="polite">
                        {modalBancadaTpPagtoCondicaoValorStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {modalBancadaTpPagtoCondicaoValorFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingModalBancadaTpPagtoCondicaoValor || isLoadingModalBancadaTpPagtoCondicaoValorOptions}>
                            {isSavingModalBancadaTpPagtoCondicaoValor ? 'Salvando...' : editingModalBancadaTpPagtoCondicaoValorCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelModalBancadaTpPagtoCondicaoValorForm} disabled={isSavingModalBancadaTpPagtoCondicaoValor}>
                          {modalBancadaTpPagtoCondicaoValorFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingModalBancadaTpPagtoCondicaoValorItems ? 'Atualizando...' : `${modalBancadaTpPagtoCondicaoValorTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Modalidade</th>
                        <th>Tipo de Bancada</th>
                        <th>Tipo de Pagamento</th>
                        <th>Condicao</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalBancadaTpPagtoCondicaoValorItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.modalidadeDescricao}</td>
                          <td>{item.tipoBancadaDescricao}</td>
                          <td>{item.tipoPgtoDescricao}</td>
                          <td>{item.condicaoDescricao}</td>
                          <td>{item.data}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewModalBancadaTpPagtoCondicaoValor(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditModalBancadaTpPagtoCondicaoValor(item)}
                                disabled={isDeletingModalBancadaTpPagtoCondicaoValor}
                              >
                                Alterar
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteModalBancadaTpPagtoCondicaoValor(item)}
                                disabled={isDeletingModalBancadaTpPagtoCondicaoValor}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingModalBancadaTpPagtoCondicaoValorItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingModalBancadaTpPagtoCondicaoValorItems && !modalBancadaTpPagtoCondicaoValorItems.length ? (
                    <p className="management-empty-state">Nenhum registro de valor encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${modalBancadaTpPagtoCondicaoValorStatusTone}`} aria-live="polite">
                  {isModalBancadaTpPagtoCondicaoValorFormVisible ? '' : modalBancadaTpPagtoCondicaoValorStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoValorPage(1)}
                    disabled={!canGoToPreviousModalBancadaTpPagtoCondicaoValorPage || isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoValorPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousModalBancadaTpPagtoCondicaoValorPage || isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {modalBancadaTpPagtoCondicaoValorPage} de {modalBancadaTpPagtoCondicaoValorTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoValorPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextModalBancadaTpPagtoCondicaoValorPage || isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoValorPage(modalBancadaTpPagtoCondicaoValorTotalPages)}
                    disabled={!canGoToNextModalBancadaTpPagtoCondicaoValorPage || isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'kmValor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tabela Km_Valor</h2>
              <p className="content-description">
                Cadastre os valores por data vinculados a Condicao. A combinacao entre condicao e data nao pode se repetir e o valor aceita zero.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertKmValor}
                  disabled={isSavingKmValor || isDeletingKmValor || isLoadingKmValorOptions}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterKmValorSubmit}>
                  <label className="field-group" htmlFor="km-valor-filter-condicao">
                    <span>Condicao</span>
                    <select
                      id="km-valor-filter-condicao"
                      value={kmValorFilterCondicaoCodigo}
                      onChange={(event) => setKmValorFilterCondicaoCodigo(event.target.value)}
                      disabled={isLoadingKmValorItems || isLoadingKmValorOptions}
                    >
                      <option value="">Todas</option>
                      {kmValorCondicaoOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.descricao} ({item.qtdeIni} a {item.qtdeFim})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="km-valor-filter-data">
                    <span>Data</span>
                    <input
                      id="km-valor-filter-data"
                      type="date"
                      value={kmValorFilterData}
                      onChange={(event) => setKmValorFilterData(event.target.value)}
                      disabled={isLoadingKmValorItems}
                    />
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearKmValorFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isKmValorFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingKmValor) {
                      handleCancelKmValorForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="km-valor-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateKmValor} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro</p>
                          <h2 id="km-valor-modal-title">KM_VALOR</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelKmValorForm}
                          disabled={isSavingKmValor}
                          aria-label="Fechar formulario de km valor"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {kmValorFormMode === 'view' ? 'Consulta de registro' : editingKmValorCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="km-valor-condicao">
                        <span>Condicao</span>
                        <select
                          id="km-valor-condicao"
                          value={kmValorCondicaoCodigo}
                          onChange={(event) => setKmValorCondicaoCodigo(event.target.value)}
                          disabled={isLoadingKmValorOptions || isSavingKmValor || kmValorFormMode === 'view'}
                        >
                          <option value="">Selecione a condicao</option>
                          {kmValorCondicaoOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {item.descricao} ({item.qtdeIni} a {item.qtdeFim})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="km-valor-data">
                        <span>Data</span>
                        <input
                          id="km-valor-data"
                          type="date"
                          value={kmValorData}
                          onChange={(event) => setKmValorData(event.target.value)}
                          disabled={isSavingKmValor || kmValorFormMode === 'view'}
                        />
                      </label>

                      <label className="field-group" htmlFor="km-valor-valor">
                        <span>Valor</span>
                        <input
                          id="km-valor-valor"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={kmValorValor}
                          onChange={(event) => setKmValorValor(formatCurrencyInput(event.target.value))}
                          disabled={isSavingKmValor || kmValorFormMode === 'view'}
                        />
                      </label>

                      <p className={`status-message status-${kmValorStatusTone}`} aria-live="polite">
                        {kmValorStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {kmValorFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingKmValor || isLoadingKmValorOptions}>
                            {isSavingKmValor ? 'Salvando...' : editingKmValorCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelKmValorForm} disabled={isSavingKmValor}>
                          {kmValorFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingKmValorItems ? 'Atualizando...' : `${kmValorTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Condicao</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kmValorItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.condicaoDescricao}</td>
                          <td>{item.data}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewKmValor(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditKmValor(item)}
                                disabled={isDeletingKmValor}
                              >
                                Alterar
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteKmValor(item)}
                                disabled={isDeletingKmValor}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingKmValorItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingKmValorItems && !kmValorItems.length ? (
                    <p className="management-empty-state">Nenhum registro de km valor encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${kmValorStatusTone}`} aria-live="polite">
                  {isKmValorFormVisible ? '' : kmValorStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setKmValorPage(1)}
                    disabled={!canGoToPreviousKmValorPage || isLoadingKmValorItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setKmValorPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousKmValorPage || isLoadingKmValorItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {kmValorPage} de {kmValorTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setKmValorPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextKmValorPage || isLoadingKmValorItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setKmValorPage(kmValorTotalPages)}
                    disabled={!canGoToNextKmValorPage || isLoadingKmValorItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'continuaValor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tabela Continua_Valor</h2>
              <p className="content-description">
                Cadastre os valores por data para o tipo Continua. O tipo continua usa combobox com as opcoes Regular e Cadeirante, e a combinacao entre tipo e data nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertContinuaValor}
                  disabled={isSavingContinuaValor || isDeletingContinuaValor}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterContinuaValorSubmit}>
                  <label className="field-group" htmlFor="continua-valor-filter-tipo">
                    <span>Tipo Continua</span>
                    <select
                      id="continua-valor-filter-tipo"
                      value={continuaValorFilterTipo}
                      onChange={(event) => setContinuaValorFilterTipo(event.target.value as ContinuaValorTipo | '')}
                      disabled={isLoadingContinuaValorItems}
                    >
                      <option value="">Todos</option>
                      {CONTINUA_TIPO_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="continua-valor-filter-data">
                    <span>Data</span>
                    <input
                      id="continua-valor-filter-data"
                      type="date"
                      value={continuaValorFilterData}
                      onChange={(event) => setContinuaValorFilterData(event.target.value)}
                      disabled={isLoadingContinuaValorItems}
                    />
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearContinuaValorFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isContinuaValorFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingContinuaValor) {
                      handleCancelContinuaValorForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="continua-valor-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateContinuaValor} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro</p>
                          <h2 id="continua-valor-modal-title">CONTINUA_VALOR</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelContinuaValorForm}
                          disabled={isSavingContinuaValor}
                          aria-label="Fechar formulario de continua valor"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {continuaValorFormMode === 'view' ? 'Consulta de registro' : editingContinuaValorCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="continua-valor-tipo">
                        <span>Tipo Continua</span>
                        <select
                          id="continua-valor-tipo"
                          value={continuaValorTipo}
                          onChange={(event) => setContinuaValorTipo(event.target.value as ContinuaValorTipo | '')}
                          disabled={isSavingContinuaValor || continuaValorFormMode === 'view'}
                        >
                          <option value="">Selecione o tipo continua</option>
                          {CONTINUA_TIPO_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="continua-valor-data">
                        <span>Data</span>
                        <input
                          id="continua-valor-data"
                          type="date"
                          value={continuaValorData}
                          onChange={(event) => setContinuaValorData(event.target.value)}
                          disabled={isSavingContinuaValor || continuaValorFormMode === 'view'}
                        />
                      </label>

                      <label className="field-group" htmlFor="continua-valor-valor">
                        <span>Valor</span>
                        <input
                          id="continua-valor-valor"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={continuaValorValor}
                          onChange={(event) => setContinuaValorValor(formatCurrencyInput(event.target.value))}
                          disabled={isSavingContinuaValor || continuaValorFormMode === 'view'}
                        />
                      </label>

                      <p className={`status-message status-${continuaValorStatusTone}`} aria-live="polite">
                        {continuaValorStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {continuaValorFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingContinuaValor}>
                            {isSavingContinuaValor ? 'Salvando...' : editingContinuaValorCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelContinuaValorForm} disabled={isSavingContinuaValor}>
                          {continuaValorFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingContinuaValorItems ? 'Atualizando...' : `${continuaValorTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Tipo Continua</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {continuaValorItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.tipoContinua}</td>
                          <td>{item.data}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewContinuaValor(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditContinuaValor(item)}
                                disabled={isDeletingContinuaValor}
                              >
                                Alterar
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteContinuaValor(item)}
                                disabled={isDeletingContinuaValor}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingContinuaValorItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingContinuaValorItems && !continuaValorItems.length ? (
                    <p className="management-empty-state">Nenhum registro de continua valor encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${continuaValorStatusTone}`} aria-live="polite">
                  {isContinuaValorFormVisible ? '' : continuaValorStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setContinuaValorPage(1)}
                    disabled={!canGoToPreviousContinuaValorPage || isLoadingContinuaValorItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setContinuaValorPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousContinuaValorPage || isLoadingContinuaValorItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {continuaValorPage} de {continuaValorTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setContinuaValorPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextContinuaValorPage || isLoadingContinuaValorItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setContinuaValorPage(continuaValorTotalPages)}
                    disabled={!canGoToNextContinuaValorPage || isLoadingContinuaValorItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'tipoBancada' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Tipo de Bancada</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela Tipo de Bancada. O codigo e gerado
                automaticamente e a descricao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertTipoBancada}
                  disabled={isSavingTipoBancada || isDeletingTipoBancada}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterTipoBancadaSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo ou descricao"
                    value={tipoBancadaSearch}
                    onChange={(event) => setTipoBancadaSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearTipoBancadaFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isTipoBancadaFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingTipoBancada) {
                      handleCancelTipoBancadaForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tipo-bancada-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateTipoBancada} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo</p>
                          <h2 id="tipo-bancada-modal-title">TIPO DE BANCADA</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelTipoBancadaForm}
                          disabled={isSavingTipoBancada}
                          aria-label="Fechar formulario de tipo de bancada"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {tipoBancadaFormMode === 'view' ? 'Consulta de registro' : editingTipoBancadaCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="tipo-bancada-descricao">
                        <span>Descricao</span>
                        <input
                          id="tipo-bancada-descricao"
                          name="descricao"
                          type="text"
                          value={tipoBancadaDescricao}
                          onChange={(event) => setTipoBancadaDescricao(event.target.value)}
                          disabled={isSavingTipoBancada || tipoBancadaFormMode === 'view'}
                          aria-invalid={Boolean(tipoBancadaDescricaoError)}
                        />
                        {tipoBancadaDescricaoError ? <strong className="field-error">{tipoBancadaDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${tipoBancadaStatusTone}`} aria-live="polite">
                        {tipoBancadaStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {tipoBancadaFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingTipoBancada}>
                            {isSavingTipoBancada ? 'Salvando...' : editingTipoBancadaCodigo ? 'Salvar alteracao' : 'Salvar Tipo de Bancada'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelTipoBancadaForm} disabled={isSavingTipoBancada}>
                          {tipoBancadaFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingTipoBancada ? 'Atualizando...' : `${tipoBancadaTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoBancada('codigo')}>
                            Codigo <span>{getTipoBancadaSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoBancada('descricao')}>
                            Descricao <span>{getTipoBancadaSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipoBancadaItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewTipoBancada(item)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditTipoBancada(item)}>
                                Alterar
                              </button>
                              <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteTipoBancada(item)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingTipoBancada && tipoBancadaItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de tipo de bancada encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${tipoBancadaStatusTone}`} aria-live="polite">
                  {isTipoBancadaFormVisible ? '' : tipoBancadaStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoBancadaPage(1)}
                    disabled={!canGoToPreviousTipoBancadaPage || isLoadingTipoBancada}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoBancadaPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousTipoBancadaPage || isLoadingTipoBancada}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {tipoBancadaPage} de {tipoBancadaTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoBancadaPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextTipoBancadaPage || isLoadingTipoBancada}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoBancadaPage(tipoBancadaTotalPages)}
                    disabled={!canGoToNextTipoBancadaPage || isLoadingTipoBancada}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>

            <div className="management-card management-grid-card dre-list-card">
              <div className="management-grid-header">
                <h2>Associações Modalidade x Tipo de Bancada</h2>
                <span>{tipoBancadaAssociationItems.length} associação(ões) cadastrada(s)</span>
              </div>

              <div className="management-toolbar">
                <form className="management-filter-form" onSubmit={handleAddTipoBancadaAssociation}>
                  <label className="field-group" htmlFor="association-modalidade">
                    <span>Modalidade</span>
                    <select
                      id="association-modalidade"
                      value={associationModalidadeCodigo}
                      onChange={(event) => setAssociationModalidadeCodigo(event.target.value)}
                      disabled={isLoadingAssociationOptions || isSavingTipoBancadaAssociation}
                    >
                      <option value="">Selecione a modalidade</option>
                      {associationModalidadeOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.codigo} - {item.descricao}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group" htmlFor="association-tipo-bancada">
                    <span>Tipo de Bancada</span>
                    <select
                      id="association-tipo-bancada"
                      value={associationTipoBancadaCodigo}
                      onChange={(event) => setAssociationTipoBancadaCodigo(event.target.value)}
                      disabled={isLoadingAssociationOptions || isSavingTipoBancadaAssociation}
                    >
                      <option value="">Selecione o tipo de bancada</option>
                      {associationTipoBancadaOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.codigo} - {item.descricao}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button type="submit" className="primary-button" disabled={isLoadingAssociationOptions || isSavingTipoBancadaAssociation}>
                    {isLoadingAssociationOptions ? 'Carregando...' : isSavingTipoBancadaAssociation ? 'Criando...' : 'Criar associação'}
                  </button>
                </form>
              </div>

              <p className={`status-message status-${associationStatusTone}`} aria-live="polite">
                {associationStatusMessage}
              </p>

              <div className="management-grid-wrapper">
                <table className="dre-table">
                  <thead>
                    <tr>
                      <th>Modalidade</th>
                      <th>Tipo de Bancada</th>
                      <th className="dre-actions-column">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipoBancadaAssociationItems.map((item) => (
                      <tr key={item.codigo}>
                        <td>{item.modalidadeCodigo} - {item.modalidadeDescricao}</td>
                        <td>{item.tipoBancadaCodigo} - {item.tipoBancadaDescricao}</td>
                        <td>
                          <div className="dre-row-actions">
                            <button
                              type="button"
                              className="row-action-button row-action-delete"
                              onClick={() => handleDeleteTipoBancadaAssociation(item)}
                              disabled={isDeletingTipoBancadaAssociation}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {isLoadingTipoBancadaAssociations ? (
                  <p className="management-empty-state">Carregando associações...</p>
                ) : null}

                {!tipoBancadaAssociationItems.length ? (
                  <p className="management-empty-state">Nenhuma associação cadastrada.</p>
                ) : null}
              </div>
            </div>
          </>
        ) : activeView === 'titular' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Titular do CRM</h2>
              <p className="content-description">
                Cadastre e consulte os registros de titulares do CRM carregados inicialmente a partir do XML. O codigo e gerado automaticamente, com filtro, ordenacao, paginacao e CRUD completo.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertTitular}
                  disabled={isSavingTitular || isDeletingTitular}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterTitularSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, CNPJ/CPF ou titular do CRM"
                    value={titularSearch}
                    onChange={(event) => setTitularSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearTitularFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isTitularFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingTitular) {
                      handleCancelTitularForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="titular-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateTitular} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo</p>
                          <h2 id="titular-modal-title">TITULAR DO CRM</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelTitularForm}
                          disabled={isSavingTitular}
                          aria-label="Fechar formulario de titular do CRM"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {titularFormMode === 'view' ? 'Consulta de registro' : editingTitularCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="titular-cnpj-cpf">
                        <span>CNPJ/CPF</span>
                        <input
                          id="titular-cnpj-cpf"
                          name="cnpj-cpf"
                          type="text"
                          inputMode="numeric"
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                          maxLength={18}
                          value={titularCnpjCpf}
                          onChange={(event) => setTitularCnpjCpf(formatCpfOrCnpj(event.target.value))}
                          disabled={isSavingTitular || titularFormMode === 'view'}
                          aria-invalid={Boolean(titularCnpjCpfError)}
                        />
                        {titularCnpjCpfError ? <strong className="field-error">{titularCnpjCpfError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="titular-nome">
                        <span>Titular do CRM</span>
                        <input
                          id="titular-nome"
                          name="titular"
                          type="text"
                          value={titularNome}
                          onChange={(event) => setTitularNome(event.target.value)}
                          disabled={isSavingTitular || titularFormMode === 'view'}
                          aria-invalid={Boolean(titularNomeError)}
                        />
                        {titularNomeError ? <strong className="field-error">{titularNomeError}</strong> : null}
                      </label>

                      <p className={`status-message status-${titularStatusTone}`} aria-live="polite">
                        {titularStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {titularFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingTitular}>
                            {isSavingTitular ? 'Salvando...' : editingTitularCodigo ? 'Salvar alteracao' : 'Salvar titular do CRM'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelTitularForm} disabled={isSavingTitular}>
                          {titularFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingTitular ? 'Atualizando...' : `${titularTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTitular('codigo')}>
                            Codigo <span>{getTitularSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTitular('cnpj_cpf')}>
                            CNPJ/CPF <span>{getTitularSortIndicator('cnpj_cpf')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTitular('titular')}>
                            Titular do CRM <span>{getTitularSortIndicator('titular')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {titularItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.cnpj_cpf}</td>
                          <td>{item.titular}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewTitular(item)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditTitular(item)}>
                                Alterar
                              </button>
                              <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteTitular(item)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingTitular && titularItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de titular do CRM encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${titularStatusTone}`} aria-live="polite">
                  {isTitularFormVisible ? '' : titularStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTitularPage(1)}
                    disabled={!canGoToPreviousTitularPage || isLoadingTitular}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTitularPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousTitularPage || isLoadingTitular}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {titularPage} de {titularTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTitularPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextTitularPage || isLoadingTitular}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTitularPage(titularTotalPages)}
                    disabled={!canGoToNextTitularPage || isLoadingTitular}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'marcaModelo' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Marca/Modelo</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela de marca/modelo importada do XML. O codigo e gerado automaticamente e a descricao permanece obrigatoria e unica.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertMarcaModelo}
                  disabled={isSavingMarcaModelo || isDeletingMarcaModelo}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterMarcaModeloSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo ou descricao"
                    value={marcaModeloSearch}
                    onChange={(event) => setMarcaModeloSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearMarcaModeloFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isMarcaModeloFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingMarcaModelo) {
                      handleCancelMarcaModeloForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="marca-modelo-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateMarcaModelo} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo</p>
                          <h2 id="marca-modelo-modal-title">MARCA/MODELO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelMarcaModeloForm}
                          disabled={isSavingMarcaModelo}
                          aria-label="Fechar formulario de marca/modelo"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {marcaModeloFormMode === 'view' ? 'Consulta de registro' : editingMarcaModeloCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="marca-modelo-descricao">
                        <span>Descricao</span>
                        <input
                          id="marca-modelo-descricao"
                          name="descricao"
                          type="text"
                          value={marcaModeloDescricao}
                          onChange={(event) => setMarcaModeloDescricao(event.target.value)}
                          disabled={isSavingMarcaModelo || marcaModeloFormMode === 'view'}
                          aria-invalid={Boolean(marcaModeloDescricaoError)}
                        />
                        {marcaModeloDescricaoError ? <strong className="field-error">{marcaModeloDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${marcaModeloStatusTone}`} aria-live="polite">
                        {marcaModeloStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {marcaModeloFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingMarcaModelo}>
                            {isSavingMarcaModelo ? 'Salvando...' : editingMarcaModeloCodigo ? 'Salvar alteracao' : 'Salvar marca/modelo'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelMarcaModeloForm} disabled={isSavingMarcaModelo}>
                          {marcaModeloFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingMarcaModelo ? 'Atualizando...' : `${marcaModeloTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortMarcaModelo('codigo')}>
                            Codigo <span>{getMarcaModeloSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortMarcaModelo('descricao')}>
                            Descricao <span>{getMarcaModeloSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marcaModeloItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewMarcaModelo(item)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditMarcaModelo(item)}>
                                Alterar
                              </button>
                              <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteMarcaModelo(item)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingMarcaModelo && marcaModeloItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de marca/modelo encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${marcaModeloStatusTone}`} aria-live="polite">
                  {isMarcaModeloFormVisible ? '' : marcaModeloStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setMarcaModeloPage(1)}
                    disabled={!canGoToPreviousMarcaModeloPage || isLoadingMarcaModelo}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setMarcaModeloPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousMarcaModeloPage || isLoadingMarcaModelo}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {marcaModeloPage} de {marcaModeloTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setMarcaModeloPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextMarcaModeloPage || isLoadingMarcaModelo}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setMarcaModeloPage(marcaModeloTotalPages)}
                    disabled={!canGoToNextMarcaModeloPage || isLoadingMarcaModelo}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'parametroVeiculo' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Parametro Pgto Veiculo</h2>
              <p className="content-description">
                Cadastre os parametros por data vinculando modalidade x tipo de bancada, condicao e quantidade da condicao. A combinacao entre associacao, condicao e data nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertParametroVeiculo}
                  disabled={isSavingParametroVeiculo || isDeletingParametroVeiculo || isLoadingParametroVeiculoOptions}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterParametroVeiculoSubmit}>
                  <label className="field-group" htmlFor="parametro-veiculo-filter-associacao">
                    <span>Modalidade x Tipo de Bancada</span>
                    <select
                      id="parametro-veiculo-filter-associacao"
                      value={parametroVeiculoFilterModalidadeTipoBancadaCodigo}
                      onChange={(event) => setParametroVeiculoFilterModalidadeTipoBancadaCodigo(event.target.value)}
                      disabled={isLoadingParametroVeiculoItems || isLoadingParametroVeiculoOptions}
                    >
                      <option value="">Todas</option>
                      {parametroVeiculoAssociationOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {formatModalidadeTipoBancadaLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="parametro-veiculo-filter-condicao">
                    <span>Condicao</span>
                    <input
                      id="parametro-veiculo-filter-condicao"
                      type="text"
                      value={parametroVeiculoFilterCondicao}
                      onChange={(event) => setParametroVeiculoFilterCondicao(event.target.value)}
                      disabled={isLoadingParametroVeiculoItems}
                    />
                  </label>
                  <label className="field-group" htmlFor="parametro-veiculo-filter-data">
                    <span>Data</span>
                    <input
                      id="parametro-veiculo-filter-data"
                      type="date"
                      value={parametroVeiculoFilterData}
                      onChange={(event) => setParametroVeiculoFilterData(event.target.value)}
                      disabled={isLoadingParametroVeiculoItems}
                    />
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearParametroVeiculoFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isParametroVeiculoFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingParametroVeiculo) {
                      handleCancelParametroVeiculoForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="parametro-veiculo-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateParametroVeiculo} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro</p>
                          <h2 id="parametro-veiculo-modal-title">PARAMETRO PGTO VEICULO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelParametroVeiculoForm}
                          disabled={isSavingParametroVeiculo}
                          aria-label="Fechar formulario de parametro do veiculo"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {parametroVeiculoFormMode === 'view' ? 'Consulta de registro' : editingParametroVeiculoCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="parametro-veiculo-data">
                        <span>Data</span>
                        <input
                          id="parametro-veiculo-data"
                          type="date"
                          value={parametroVeiculoData}
                          onChange={(event) => setParametroVeiculoData(event.target.value)}
                          disabled={isSavingParametroVeiculo || parametroVeiculoFormMode === 'view'}
                        />
                      </label>

                      <label className="field-group" htmlFor="parametro-veiculo-associacao">
                        <span>Modalidade x Tipo de Bancada</span>
                        <select
                          id="parametro-veiculo-associacao"
                          value={parametroVeiculoModalidadeTipoBancadaCodigo}
                          onChange={(event) => setParametroVeiculoModalidadeTipoBancadaCodigo(event.target.value)}
                          disabled={isLoadingParametroVeiculoOptions || isSavingParametroVeiculo || parametroVeiculoFormMode === 'view'}
                        >
                          <option value="">Selecione a associacao</option>
                          {parametroVeiculoAssociationOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {formatModalidadeTipoBancadaLabel(item)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="parametro-veiculo-condicao">
                        <span>Condicao</span>
                        <select
                          id="parametro-veiculo-condicao"
                          value={parametroVeiculoCondicao}
                          onChange={(event) => setParametroVeiculoCondicao(event.target.value)}
                          disabled={isSavingParametroVeiculo || parametroVeiculoFormMode === 'view'}
                        >
                          <option value="">Selecione a condicao</option>
                          {PARAMETRO_VEICULO_CONDICAO_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="parametro-veiculo-qtde-condicao">
                        <span>Qtde da condicao</span>
                        <input
                          id="parametro-veiculo-qtde-condicao"
                          type="number"
                          min="0"
                          step="1"
                          value={parametroVeiculoQtdeCondicao}
                          onChange={(event) => setParametroVeiculoQtdeCondicao(event.target.value)}
                          disabled={isSavingParametroVeiculo || parametroVeiculoFormMode === 'view'}
                        />
                      </label>

                      <p className={`status-message status-${parametroVeiculoStatusTone}`} aria-live="polite">
                        {parametroVeiculoStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {parametroVeiculoFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingParametroVeiculo || isLoadingParametroVeiculoOptions}>
                            {isSavingParametroVeiculo ? 'Salvando...' : editingParametroVeiculoCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelParametroVeiculoForm} disabled={isSavingParametroVeiculo}>
                          {parametroVeiculoFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingParametroVeiculoItems ? 'Atualizando...' : `${parametroVeiculoTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Modalidade</th>
                        <th>Tipo de Bancada</th>
                        <th>Condicao</th>
                        <th>Qtde da Condicao</th>
                        <th>Data</th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parametroVeiculoItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.modalidadeDescricao}</td>
                          <td>{item.tipoBancadaDescricao}</td>
                          <td>{item.condicao}</td>
                          <td>{item.qtdeCondicao}</td>
                          <td>{item.data}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewParametroVeiculo(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditParametroVeiculo(item)}
                                disabled={isDeletingParametroVeiculo}
                              >
                                Alterar
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteParametroVeiculo(item)}
                                disabled={isDeletingParametroVeiculo}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingParametroVeiculoItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingParametroVeiculoItems && !parametroVeiculoItems.length ? (
                    <p className="management-empty-state">Nenhum registro de parametro veiculo encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${parametroVeiculoStatusTone}`} aria-live="polite">
                  {isParametroVeiculoFormVisible ? '' : parametroVeiculoStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setParametroVeiculoPage(1)}
                    disabled={!canGoToPreviousParametroVeiculoPage || isLoadingParametroVeiculoItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setParametroVeiculoPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousParametroVeiculoPage || isLoadingParametroVeiculoItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {parametroVeiculoPage} de {parametroVeiculoTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setParametroVeiculoPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextParametroVeiculoPage || isLoadingParametroVeiculoItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setParametroVeiculoPage(parametroVeiculoTotalPages)}
                    disabled={!canGoToNextParametroVeiculoPage || isLoadingParametroVeiculoItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'seguradora' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Seguradoras</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela de seguradoras carregada inicialmente a partir do XML. O codigo e gerado automaticamente, enquanto controle e descricao permanecem obrigatorios.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertSeguradora}
                  disabled={isSavingSeguradora || isDeletingSeguradora}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterSeguradoraSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, controle ou descricao"
                    value={seguradoraSearch}
                    onChange={(event) => setSeguradoraSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearSeguradoraFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isSeguradoraFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingSeguradora) {
                      handleCancelSeguradoraForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="seguradora-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateSeguradora} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo</p>
                          <h2 id="seguradora-modal-title">SEGURADORAS</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelSeguradoraForm}
                          disabled={isSavingSeguradora}
                          aria-label="Fechar formulario de seguradoras"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {seguradoraFormMode === 'view' ? 'Consulta de registro' : editingSeguradoraCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="seguradora-controle">
                        <span>Controle</span>
                        <input
                          id="seguradora-controle"
                          name="controle"
                          type="text"
                          value={seguradoraControle}
                          onChange={(event) => setSeguradoraControle(event.target.value)}
                          disabled={isSavingSeguradora || seguradoraFormMode === 'view'}
                          aria-invalid={Boolean(seguradoraControleError)}
                        />
                        {seguradoraControleError ? <strong className="field-error">{seguradoraControleError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="seguradora-lista">
                        <span>Descricao</span>
                        <input
                          id="seguradora-lista"
                          name="lista"
                          type="text"
                          value={seguradoraLista}
                          onChange={(event) => setSeguradoraLista(event.target.value)}
                          disabled={isSavingSeguradora || seguradoraFormMode === 'view'}
                          aria-invalid={Boolean(seguradoraListaError)}
                        />
                        {seguradoraListaError ? <strong className="field-error">{seguradoraListaError}</strong> : null}
                      </label>

                      <p className={`status-message status-${seguradoraStatusTone}`} aria-live="polite">
                        {seguradoraStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {seguradoraFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingSeguradora}>
                            {isSavingSeguradora ? 'Salvando...' : editingSeguradoraCodigo ? 'Salvar alteracao' : 'Salvar seguradora'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelSeguradoraForm} disabled={isSavingSeguradora}>
                          {seguradoraFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingSeguradora ? 'Atualizando...' : `${seguradoraTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortSeguradora('codigo')}>
                            Codigo <span>{getSeguradoraSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortSeguradora('controle')}>
                            Controle <span>{getSeguradoraSortIndicator('controle')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortSeguradora('descricao')}>
                            Descricao <span>{getSeguradoraSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seguradoraItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.controle}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewSeguradora(item)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditSeguradora(item)}>
                                Alterar
                              </button>
                              <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteSeguradora(item)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingSeguradora && seguradoraItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de seguradora encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${seguradoraStatusTone}`} aria-live="polite">
                  {isSeguradoraFormVisible ? '' : seguradoraStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setSeguradoraPage(1)}
                    disabled={!canGoToPreviousSeguradoraPage || isLoadingSeguradora}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setSeguradoraPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousSeguradoraPage || isLoadingSeguradora}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {seguradoraPage} de {seguradoraTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setSeguradoraPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextSeguradoraPage || isLoadingSeguradora}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setSeguradoraPage(seguradoraTotalPages)}
                    disabled={!canGoToNextSeguradoraPage || isLoadingSeguradora}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'troca' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Tipo de Troca</h2>
              <p className="content-description">
                Consulte, inclua, altere e exclua os tipos de troca carregados inicialmente a partir do XML operacional.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/troca.html"
                title="Cadastro de tipo de troca"
              />
            </div>
          </>
        ) : activeView === 'acesso' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Seguranca administrativa</p>
              <h2 id="content-title">Controle de acesso</h2>
              <p className="content-description">
                Acesse o grid de cadastro, consulta, alteracao e exclusao de usuarios
                diretamente pelo menu lateral da tela administrativa.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/cadastroAcesso.html"
                title="Controle de acesso"
              />
            </div>
          </>
        ) : activeView === 'loginDre' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Relacionamento administrativo</p>
              <h2 id="content-title">Login x DRE</h2>
              <p className="content-description">
                Consulte e mantenha os relacionamentos entre usuarios e DRE com selecao por codigo.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/loginDre.html"
                title="Login x DRE"
              />
            </div>
          </>
        ) : activeView === 'condutor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Condutor</h2>
              <p className="content-description">
                Consulte, inclua e altere os registros de condutores no mesmo padrao do controle de acesso.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/condutor.html"
                title="Cadastro de condutor"
              />
            </div>
          </>
        ) : activeView === 'monitor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Monitor</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os registros de monitores no mesmo padrao operacional da tela de condutor.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/monitor.html"
                title="Cadastro de monitor"
              />
            </div>
          </>
        ) : activeView === 'credenciamentoTermo' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Credenciamento Termo</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe credenciamentos termo a partir do XML com relacao automatica da credenciada e desdobramento por aditivo.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/credenciamentoTermo.html"
                title="Cadastro de credenciamento termo"
              />
            </div>
          </>
        ) : activeView === 'emissaoDocumentoParametro' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Parametros legais</p>
              <h2 id="content-title">Parametros de Emissao</h2>
              <p className="content-description">
                Mantenha os textos formais da emissao por data de referencia, sem depender apenas do seed inicial do banco.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/emissaoDocumentoParametro.html"
                title="Parametros de emissao"
              />
            </div>
          </>
        ) : activeView === 'veiculo' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Veiculo</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os registros de veiculos a partir do XML no mesmo padrao operacional da tela de monitor.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/veiculo.html"
                title="Cadastro de veiculo"
              />
            </div>
          </>
        ) : activeView === 'veiculoHistorico' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Consulta operacional</p>
              <h2 id="content-title">Historico de Veiculo</h2>
              <p className="content-description">
                Consulte o historico de alteracoes dos veiculos, incluindo acao executada, usuario responsavel e dados completos gravados em cada evento.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/veiculoHistorico.html"
                title="Historico de veiculo"
              />
            </div>
          </>
        ) : activeView === 'vinculoCondutor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Vinculo de Condutor</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os vinculos de condutor a partir do XML no mesmo padrao operacional da tela de veiculo.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/vinculoCondutor.html"
                title="Cadastro de vinculo do condutor"
              />
            </div>
          </>
        ) : activeView === 'vinculoMonitor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Vinculo de Monitor</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os vinculos de monitor a partir do XML no mesmo padrao operacional da tela de vinculo do condutor.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/vinculoMonitor.html"
                title="Cadastro de vinculo do monitor"
              />
            </div>
          </>
        ) : activeView === 'cep' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Tabela de enderecamento</p>
              <h2 id="content-title">CEP</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os registros de CEP com auto-preenchimento de endereco via ViaCEP.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/cep.html"
                title="Cadastro de CEP"
              />
            </div>
          </>
        ) : activeView === 'ordemServico' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">OrdemServico</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe Ordens de Servico com busca relacional de credenciada, DRE, condutor, preposto, veiculo, monitor e tipo de troca.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/ordemServico.html"
                title="OrdemServico"
              />
            </div>
          </>
        ) : activeView === 'smoke' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Validacao operacional</p>
              <h2 id="content-title">Smoke Test da Aplicacao</h2>
              <p className="content-description">
                Execute a suite completa ou uma suite especifica da API local e acompanhe erros,
                resumo detalhado por suite, importacoes exercitadas e o trecho final do log.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <div className="smoke-suite-selector" role="group" aria-label="Selecionar suite de smoke">
                  {smokeSuiteOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`secondary-button smoke-suite-button ${selectedSmokeSuite === option.value ? 'smoke-suite-button-active' : ''}`}
                      onClick={() => setSelectedSmokeSuite(option.value)}
                      disabled={isRunningSmoke}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleRunFullSmoke}
                  disabled={isRunningSmoke}
                >
                  {isRunningSmoke ? 'Executando smoke...' : 'Executar smoke selecionado'}
                </button>
              </div>

              <div className="management-card smoke-card">
                <h2>Resultado da execucao</h2>
                <p className={`status-message status-${smokeStatusTone}`} aria-live="polite">
                  {smokeStatusMessage}
                </p>

                {smokeResult ? (
                  <div className="smoke-summary-grid">
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Suite solicitada</span>
                      <strong>{smokeResult.suite}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Status</span>
                      <strong>{smokeResult.status}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Exit code</span>
                      <strong>{smokeResult.exitCode}</strong>
                    </article>
                    {smokeResult.invalidFixtureStatus !== 'not-run' ? (
                      <article className="smoke-summary-card">
                        <span className="smoke-card-label">Fixtures invalidos</span>
                        <strong>{smokeResult.invalidFixtureStatus}</strong>
                      </article>
                    ) : null}
                    <article className="smoke-summary-card smoke-summary-card-wide">
                      <span className="smoke-card-label">Script</span>
                      <strong>{smokeResult.scriptName}</strong>
                    </article>
                    {smokeResult.reportPath ? (
                      <article className="smoke-summary-card smoke-summary-card-wide">
                        <span className="smoke-card-label">Relatorio JSON</span>
                        <strong>{smokeResult.reportPath}</strong>
                        <div className="smoke-report-actions">
                          <button type="button" className="secondary-button smoke-report-action-button" onClick={handleCopySmokeReportPath}>
                            Copiar caminho
                          </button>
                          <button type="button" className="secondary-button smoke-report-action-button" onClick={handleOpenSmokeReport}>
                            Abrir relatorio
                          </button>
                          <button type="button" className="secondary-button smoke-report-action-button" onClick={handleDownloadSmokeReport}>
                            Baixar JSON
                          </button>
                        </div>
                      </article>
                    ) : null}
                    {smokeResult.invalidFixtureReportPath ? (
                      <article className="smoke-summary-card smoke-summary-card-wide">
                        <span className="smoke-card-label">Relatorio fixtures invalidos</span>
                        <strong>{smokeResult.invalidFixtureReportPath}</strong>
                      </article>
                    ) : null}
                  </div>
                ) : null}

                {smokeReportActionMessage ? (
                  <p className="smoke-report-action-message">{smokeReportActionMessage}</p>
                ) : null}

                {smokeResult?.status === 'failed' || smokeResult?.report?.failureMessage ? (
                  <div className="smoke-error-card" role="alert">
                    <h3>Erro detectado</h3>
                    <p>{smokeResult.report?.failureMessage || smokeResult.message}</p>
                    {smokeResult.stderrTail ? (
                      <pre className="smoke-error-output">{smokeResult.stderrTail}</pre>
                    ) : null}
                  </div>
                ) : null}

                {smokeResult?.report?.executedSuites?.length ? (
                  <div className="smoke-suite-grid">
                    {smokeResult.report.executedSuites.map((suiteReport) => (
                      <article className="smoke-suite-card" key={`${suiteReport.name}-${suiteReport.startedAt ?? suiteReport.status}`}>
                        <div className="smoke-suite-card-header">
                          <div>
                            <span className="smoke-card-label">Suite</span>
                            <h3>{suiteReport.name}</h3>
                          </div>
                          <span className={`smoke-suite-badge smoke-suite-badge-${suiteReport.status}`}>{suiteReport.status}</span>
                        </div>

                        {suiteReport.failureMessage ? (
                          <p className="smoke-suite-error">{suiteReport.failureMessage}</p>
                        ) : null}

                        {suiteReport.imports?.length ? (
                          <div className="smoke-import-grid">
                            {suiteReport.imports.map((importItem) => (
                              <article className="smoke-import-card" key={`${suiteReport.name}-${importItem.label}-${importItem.fileName}`}>
                                <div className="smoke-import-card-header">
                                  <div>
                                    <span className="smoke-card-label">Importacao</span>
                                    <strong>{importItem.label}</strong>
                                  </div>
                                  <span>{importItem.fileName}</span>
                                </div>

                                <div className="smoke-import-metrics">
                                  <span>Total: {importItem.total}</span>
                                  <span>Processados: {importItem.processed}</span>
                                  <span>Incluidos: {importItem.inserted}</span>
                                  <span>Alterados: {importItem.updated}</span>
                                  <span>Recusados: {importItem.skipped}</span>
                                </div>

                                {importItem.skippedRecords.length ? (
                                  <div className="smoke-skipped-list">
                                    <span className="smoke-card-label">Recusas registradas</span>
                                    <ul>
                                      {importItem.skippedRecords.map((record) => (
                                        <li key={`${importItem.label}-${record.index}-${record.codigoXml ?? 'sem-codigo'}`}>
                                          Linha {record.index}
                                          {record.codigoXml ? `, codigo ${record.codigoXml}` : ''}
                                          : {record.message}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="smoke-suite-empty">Nenhuma importacao registrada para esta suite.</p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : null}

                {smokeResult?.invalidFixtureReport?.executedSuites?.length ? (
                  <>
                    <h3>Verificacao de fixtures invalidos</h3>
                    <div className="smoke-suite-grid">
                      {smokeResult.invalidFixtureReport.executedSuites.map((suiteReport) => (
                        <article className="smoke-suite-card" key={`${suiteReport.suite}-${suiteReport.fileName}-${suiteReport.startedAt}`}>
                          <div className="smoke-suite-card-header">
                            <div>
                              <span className="smoke-card-label">Suite</span>
                              <h3>{suiteReport.suite}</h3>
                            </div>
                            <span className={`smoke-suite-badge smoke-suite-badge-${suiteReport.status}`}>{suiteReport.status}</span>
                          </div>

                          {suiteReport.failureMessage ? (
                            <p className="smoke-suite-error">{suiteReport.failureMessage}</p>
                          ) : null}

                          {suiteReport.importSummary ? (
                            <article className="smoke-import-card">
                              <div className="smoke-import-card-header">
                                <div>
                                  <span className="smoke-card-label">Fixture</span>
                                  <strong>{suiteReport.fileName}</strong>
                                </div>
                              </div>

                              <div className="smoke-import-metrics">
                                <span>Total: {suiteReport.importSummary.total}</span>
                                <span>Processados: {suiteReport.importSummary.processed}</span>
                                <span>Incluidos: {suiteReport.importSummary.inserted}</span>
                                <span>Alterados: {suiteReport.importSummary.updated}</span>
                                <span>Recusados: {suiteReport.importSummary.skipped}</span>
                              </div>

                              {suiteReport.importSummary.skippedRecords.length ? (
                                <div className="smoke-skipped-list">
                                  <span className="smoke-card-label">Recusas no payload</span>
                                  <ul>
                                    {suiteReport.importSummary.skippedRecords.map((record) => (
                                      <li key={`${suiteReport.fileName}-${record.index}-${record.codigoXml ?? 'sem-codigo'}`}>
                                        Linha {record.index}
                                        {record.codigoXml ? `, codigo ${record.codigoXml}` : ''}
                                        : {record.message}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {suiteReport.rejectionReasons.length ? (
                                <div className="smoke-skipped-list">
                                  <span className="smoke-card-label">Recusas persistidas</span>
                                  <ul>
                                    {suiteReport.rejectionReasons.map((reason) => (
                                      <li key={`${suiteReport.fileName}-${reason}`}>{reason}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </article>
                          ) : (
                            <p className="smoke-suite-empty">Nenhum resultado estruturado foi retornado para esta verificacao.</p>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="smoke-log-card">
                  <h3>Log final</h3>
                  <div className="smoke-log-filter" role="group" aria-label="Selecionar stream do log">
                    <button
                      type="button"
                      className={`secondary-button smoke-log-filter-button ${selectedSmokeLogStream === 'stdout' ? 'smoke-log-filter-button-active' : ''} ${smokeResult?.status === 'passed' ? 'smoke-log-filter-button-recommended' : ''}`}
                      onClick={() => setSelectedSmokeLogStream('stdout')}
                    >
                      stdout
                      {smokeResult?.status === 'passed' ? <span className="smoke-log-filter-badge">principal</span> : null}
                    </button>
                    <button
                      type="button"
                      className={`secondary-button smoke-log-filter-button ${selectedSmokeLogStream === 'stderr' ? 'smoke-log-filter-button-active' : ''} ${smokeResult?.status === 'failed' ? 'smoke-log-filter-button-recommended-error' : ''}`}
                      onClick={() => setSelectedSmokeLogStream('stderr')}
                    >
                      stderr
                      {smokeResult?.status === 'failed' ? <span className="smoke-log-filter-badge smoke-log-filter-badge-error">erro</span> : null}
                    </button>
                  </div>
                  <pre className="smoke-log-output">
                    {selectedSmokeLogStream === 'stdout'
                      ? (smokeStdout || 'Nenhum stdout retornado para esta execucao.')
                      : (smokeStderr || 'Nenhum stderr retornado para esta execucao.')}
                  </pre>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Credenciada</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os registros de credenciadas a partir do XML no mesmo padrao operacional da tela de condutor.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/credenciada.html"
                title="Cadastro de credenciada"
              />
            </div>
          </>
        )}
      </section>
    </main>
    </div>
  )
}

export default App
