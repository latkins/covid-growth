import * as d3 from "d3";
import * as d3Fetch from "d3-fetch";
import * as d3Scale from "d3-scale";
import {
  hasCases,
  getNDays,
  getMaxCases,
  tidyData,
  dropCasesUnder
} from "./utils";

const dataUrl =
  "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv";

const main = async () => {
  const threshold = 100;

  // Set up data
  let data = await d3Fetch.csv(dataUrl);
  data = data.map(tidyData);
  data.forEach(d => (d.cases = dropCasesUnder(d.cases, threshold)));
  data = data.filter(hasCases);

  // Set up sizes
  const margin = { top: 20, right: 50, bottom: 100, left: 80 };
  const w = Math.min(window.innerWidth, 800) - margin.left - margin.right;
  const h = Math.min(window.innerHeight, 800) - margin.top - margin.bottom;

  // Set up axes
  const xScale = d3Scale
    .scaleLinear()
    .domain([0, getNDays(data)])
    .range([0, w]);
  const xAxis = d3.axisBottom(xScale);

  const yScale = d3Scale
    .scaleLog()
    .domain([threshold, getMaxCases(data)])
    .range([h, 0]);
  const yAxis = d3
    .axisLeft(yScale)
    .ticks(10)
    .tickFormat(d3.format(","));

  const colourScale = d3
    .scaleOrdinal(d3.schemeCategory10)
    .domain(data.map(d => d["Country/Region"]));

  const line = d3
    .line()
    .x((d, i) => xScale(i))
    .y(d => yScale(d))
    .curve(d3.curveMonotoneX);

  // Controls
  d3.select("#slider")
    .append("input")
    .attr("type", "range")
    .attr("min", 7)
    .attr("max", getNDays(data))
    .attr("step", 1)
    .attr("value", getNDays(data))
    .on("change", function() {
      rescale(this.value);
    });

  const svg = d3
    .select("#visualisation")
    .append("svg:svg")
    .attr("width", w + margin.left + margin.right)
    .attr("height", h + margin.top + margin.bottom);
  const inner = svg
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const gX = inner
    .append("g")
    .attr("class", "xAxis")
    .attr("transform", "translate(0," + h + ")")
    .call(xAxis);

  inner
    .append("text")
    .attr(
      "transform",
      "translate(" + w / 2 + " ," + (h + margin.bottom * 0.6) + ")"
    )
    .style("text-anchor", "middle")
    .text("Days since >=100 cases.");

  const gY = inner
    .append("g")
    .attr("class", "yAxis")
    .call(yAxis);

  inner
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - h / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Cases");

  let series;
  if ("ontouchstart" in document) {
    series = inner
      .style("-webkit-tap-highlight-color", "transparent")
      .append("g")
      .selectAll("g")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "countryGroup")
      .on("touchstart", enter)
      .on("touchend", exit)
      .join("g");
  } else {
    series = inner
      .append("g")
      .selectAll("g")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "countryGroup")
      .on("mouseenter", enter)
      .on("mouseleave", exit)
      .join("g");
  }

  series
    .append("path")
    .attr("fill", "none")
    .attr("stroke", d => colourScale(d["Country/Region"]))
    .attr("stroke-width", 1.5)
    .attr("opacity", "0.2")
    .attr("d", d => line(d.cases.map(v => v.count)));

  series
    .append("text")
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("opacity", "0.2")
    .attr("font-size", "small")
    .attr("x", d => xScale(d.cases.length))
    .attr("y", d => yScale(d.cases[d.cases.length - 1].count))
    .attr("dy", "0.35em")
    .text(d => d.name)
    .clone(true)
    .attr("fill", d => colourScale(d.name))
    .attr("stroke", null);

  function rescale(value) {
    xScale.domain([0, value]);
    inner
      .select(".xAxis")
      .transition()
      .call(xAxis);

    series
      .selectAll("path")
      .transition()
      .attr("d", d => line(d.cases.map(v => v.count)));

    series
      .selectAll("text")
      .attr("x", d => {
        let idx = Math.min(d.cases.length, value);
        return xScale(idx);
      })
      .attr("y", d => {
        let idx = Math.min(d.cases.length, value);
        return yScale(d.cases[idx].count);
      });
  }
};

function enter(d, i) {
  d3.select(this)
    .select("path")
    .attr("opacity", "1.0");
  d3.select(this)
    .selectAll("text")
    .attr("font-size", "large")
    .attr("opacity", "1.0");
}

function exit(d, i) {
  d3.select(this)
    .select("path")
    .attr("opacity", "0.2");
  d3.select(this)
    .selectAll("text")
    .attr("font-size", "small")
    .attr("opacity", "0.2");
}

main();
