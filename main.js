import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ---------- filters: one dropdown per field, each with an "Any" option ----------
const FILTERS = [
  { key: 'type', label: 'Type of misconduct' },
  { key: 'contact', label: 'Reason for police contact' },
  { key: 'c_eth', label: 'Complainant ethnicity' },
  { key: 'c_gender', label: 'Complainant gender' },
  { key: 'o_eth', label: 'Officer ethnicity' },
  { key: 'o_gender', label: 'Officer gender' },
  { key: 'o_rank', label: 'Officer rank at incident' },
];

const OUTCOMES = [
  { key: 'S', label: 'Substantiated' },
  { key: 'E', label: 'Exonerated' },
  { key: 'U', label: 'Unsubstantiated' },
];

const MIN_N = 30; // below this, results are flagged as unreliable
const pct = d3.format('.0%');

// ---------- load data ----------
const data = await d3.csv('allegations.csv', (row) => ({
  ...row,
  months: Number(row.months),
  year: Number(row.year),
}));

const selection = Object.fromEntries(FILTERS.map((f) => [f.key, 'Any']));

// share of each outcome in a set of rows
function summarize(rows) {
  const counts = d3.rollup(rows, (v) => v.length, (d) => d.outcome);
  return OUTCOMES.map((o) => ({
    ...o,
    count: counts.get(o.key) ?? 0,
    share: rows.length ? (counts.get(o.key) ?? 0) / rows.length : 0,
  }));
}

const overall = new Map(summarize(data).map((d) => [d.key, d.share]));

// ---------- build the dropdowns ----------
const form = d3.select('#filters');

for (const f of FILTERS) {
  // options sorted by how common they are, so the biggest groups come first
  const options = d3
    .rollups(data, (v) => v.length, (d) => d[f.key])
    .sort((a, b) => d3.descending(a[1], b[1]))
    .map(([value]) => value);

  const label = form.append('label');
  label.append('span').text(f.label);
  label
    .append('select')
    .attr('name', f.key)
    .on('change', (event) => {
      selection[f.key] = event.target.value;
      update();
    })
    .selectAll('option')
    .data(['Any', ...options])
    .join('option')
    .attr('value', (d) => d)
    .text((d) => d);
}

form
  .append('button')
  .attr('type', 'button')
  .attr('class', 'reset')
  .text('Reset')
  .on('click', () => {
    form.selectAll('select').property('value', 'Any');
    for (const f of FILTERS) selection[f.key] = 'Any';
    update();
  });

// ---------- chart skeleton (drawn once, then updated) ----------
const width = 640;
const rowH = 46;
const margin = { top: 8, right: 64, bottom: 28, left: 128 };
const height = margin.top + margin.bottom + rowH * OUTCOMES.length;

const svg = d3
  .select('#chart')
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`)
  .attr('role', 'img')
  .attr('aria-label', 'Bar chart of complaint outcomes for the selected filters');

const x = d3.scaleLinear().domain([0, 1]).range([margin.left, width - margin.right]);
const y = d3
  .scaleBand()
  .domain(OUTCOMES.map((d) => d.key))
  .range([margin.top, height - margin.bottom])
  .padding(0.35);

svg
  .append('g')
  .attr('class', 'grid')
  .attr('transform', `translate(0, ${height - margin.bottom})`)
  .call(d3.axisBottom(x).ticks(5).tickFormat(pct).tickSize(-(height - margin.top - margin.bottom)))
  .call((g) => g.select('.domain').remove());

svg
  .append('g')
  .attr('class', 'y-axis')
  .attr('transform', `translate(${margin.left - 10}, 0)`)
  .call(d3.axisLeft(y).tickSize(0).tickFormat((k) => OUTCOMES.find((o) => o.key === k).label))
  .call((g) => g.select('.domain').remove());

const bars = svg.append('g').attr('class', 'bars');
const ticks = svg.append('g').attr('class', 'baseline');
const labels = svg.append('g').attr('class', 'labels');

// baseline ticks never change: share across ALL allegations
ticks
  .selectAll('line')
  .data(OUTCOMES)
  .join('line')
  .attr('x1', (d) => x(overall.get(d.key)))
  .attr('x2', (d) => x(overall.get(d.key)))
  .attr('y1', (d) => y(d.key) - 5)
  .attr('y2', (d) => y(d.key) + y.bandwidth() + 5);

// ---------- tooltip ----------
const tooltip = d3.select('#tooltip');

function showTooltip(event, d, n) {
  tooltip
    .attr('hidden', null)
    .html(
      `<strong>${d.label}</strong><br>
       ${d3.format(',')(d.count)} of ${d3.format(',')(n)} similar allegations (${pct(d.share)})<br>
       <span class="muted">All allegations: ${pct(overall.get(d.key))}</span>`,
    )
    .style('left', `${event.clientX + 14}px`)
    .style('top', `${event.clientY + 14}px`);
}

// ---------- update everything when a dropdown changes ----------
function update() {
  const rows = data.filter((d) => FILTERS.every((f) => selection[f.key] === 'Any' || d[f.key] === selection[f.key]));
  const n = rows.length;
  const summary = summarize(rows);
  const small = n < MIN_N;

  d3.select('#stat-n').text(d3.format(',')(n));
  d3.select('#stat-months').text(n ? `${d3.median(rows, (d) => d.months)} months` : '–');
  d3.select('#stat-sub').text(n ? pct(summary[0].share) : '–');
  d3.select('#warning').attr('hidden', small && n > 0 ? null : true);
  d3.select('.results').classed('is-small', small);

  const t = svg.transition().duration(500).ease(d3.easeCubicInOut);

  bars
    .selectAll('rect')
    .data(summary, (d) => d.key) // key keeps each bar tied to its outcome
    .join('rect')
    .attr('x', x(0))
    .attr('y', (d) => y(d.key))
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .on('mousemove', (event, d) => showTooltip(event, d, n))
    .on('mouseleave', () => tooltip.attr('hidden', true))
    .transition(t)
    .attr('width', (d) => Math.max(0, x(d.share) - x(0)));

  labels
    .selectAll('text')
    .data(summary, (d) => d.key)
    .join('text')
    .attr('y', (d) => y(d.key) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .text((d) => (n ? pct(d.share) : ''))
    .transition(t)
    .attr('x', (d) => Math.max(x(d.share), x(overall.get(d.key))) + 8);
}

update();
