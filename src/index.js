import * as d3 from 'd3';
import * as d3Fetch from 'd3-fetch';
import * as d3Scale from 'd3-scale';
import {
  hasCases,
  getNDays,
  getMaxCases,
  tidyData,
  dropCasesUnder,
} from './utils';

const dataUrl =
  'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv';

const main = async () => {
  const threshold = 100;

  // Set up data
  let data = await d3Fetch.csv(dataUrl);
  data = data.map(tidyData);
  data.forEach((d) => (d.cases = dropCasesUnder(d.cases, threshold)));
  data = data.filter(hasCases);

  // Set up sizes
  const margin = {top: 20, right: 50, bottom: 80, left: 80};
  const w = window.innerWidth - margin.left - margin.right;
  const h = window.innerHeight - margin.top - margin.bottom;

  console.log(data);

  // Set up axes
  const xScale = d3Scale
      .scaleLinear()
      .domain([0, getNDays(data)])
      .range([0, w]);

  const yScale = d3Scale
      .scaleLog()
      .domain([threshold, getMaxCases(data)])
      .range([h, 0]);

  const colourScale = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain(data.map((d) => d['Country/Region']));

  const line = d3
      .line()
      .x((d, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

  const svg = d3
      .select('#visualisation')
      .append('svg:svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  svg
      .append('g')
      .attr('class', 'xAxis')
      .attr('transform', 'translate(0,' + h + ')')
      .call(d3.axisBottom(xScale));
  svg
      .append('text')
      .attr(
          'transform',
          'translate(' + w / 2 + ' ,' + (h + margin.bottom * 0.8) + ')',
      )
      .style('text-anchor', 'middle')
      .text('Days since >=100 cases.');

  svg
      .append('g')
      .attr('class', 'yAxis')
      .call(d3.axisLeft(yScale));

  svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - h / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Cases');

  const series = svg
      .append('g')
      .selectAll('g')
      .data(data)
      .join('g');

  series
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => colourScale(d['Country/Region']))
      .attr('d', (d) => line(d.cases.map((v) => v.count)));

  series
      .append('text')
      .datum((d) => {
        const geoUnit = d['Country/Region'];
        const subGeoUnit = d['Province/State'];
        let name;
        if (geoUnit === subGeoUnit || subGeoUnit === '') {
          name = geoUnit;
        } else {
          name = `${subGeoUnit}, ${geoUnit}`;
        }
        return {
          key: d['Country/Region'],
          value: d.cases[d.cases.length - 1].count,
          n: d.cases.length,
          name: name,
        };
      })
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('x', (d) => xScale(d.n))
      .attr('y', (d) => yScale(d.value))
      .attr('dy', '0.35em')
      .text((d) => d.name)
      .clone(true)
      .attr('fill', (d) => colourScale(d.key))
      .attr('stroke', null);

  series
      .selectAll('path')
      .enter()
      .on('mouseover', (group) => {
        console.log(group);
        group.style('mix-blend-mode', null).attr('stroke', '#ddd');
      });

  // const hover = (svg, path) => {
  // const dot = svg.append('g').attr('display', 'none');

  // dot.append('circle').attr('r', 2.5);

  // dot
  // .append('text')
  // .style('font', '10px sans-serif')
  // .attr('text-anchor', 'middle')
  // .attr('y', -8);

  // const moved = () => {
  // d3.event.preventDefault();
  // // const ym = yScale.invert(d3.event.layerY);
  // // const xm = xScale.invert(d3.event.layerX);
  // // const i1 = d3.bisectLeft(data, xm, 1);
  // // console.log(i1);
  // // const i0 = i1 - 1;
  // // const i = xm - data.dates[i0] > data.dates[i1] - xm ? i1 : i0;
  // // const s = data.series.reduce((a, b) =>
  // // Math.abs(a.values[i] - ym) < Math.abs(b.values[i] - ym) ? a : b,
  // // );
  // path
  // .attr('stroke', (d) => (d === s ? null : '#ddd'))
  // .filter((d) => d === s)
  // .raise();
  // // dot.attr(
  // // 'transform',
  // // `translate(${xScale(i)},${yScale(s.case[i].count)})`,
  // // );
  // // dot.select('text').text(s.name);
  // };

  // const entered = () => {
  // path.style('mix-blend-mode', null).attr('stroke', '#ddd');
  // dot.attr('display', null);
  // };

  // const left = () => {
  // path.style('mix-blend-mode', 'multiply').attr('stroke', null);
  // dot.attr('display', 'none');
  // };

  // if ('ontouchstart' in document) {
  // svg
  // .style('-webkit-tap-highlight-color', 'transparent')
  // .on('touchmove', moved)
  // .on('touchstart', entered)
  // .on('touchend', left);
  // } else {
  // svg
  // .on('mousemove', moved)
  // .on('mouseenter', entered)
  // .on('mouseleave', left);
  // }
  // };

  // // svg.call(hover, series);
};

main();
