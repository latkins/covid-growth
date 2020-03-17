import * as d3 from "d3";
import * as d3Fetch from "d3-fetch";
import * as d3Scale from "d3-scale";
import {
  hasCases,
  removeZeros,
  getMaxDays,
  getExtentKey,
  dropCasesUnder,
  makeIsSelected,
  processLockdown,
  filterData,
  mergeData
} from "./utils";

const confirmedUrl =
  "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv";
const deathsUrl =
  "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv";
const recoveredUrl =
  "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv";

const main = async () => {
  const threshold = 100;

  // Set up data
  let confirmedData = await d3Fetch.csv(confirmedUrl);
  let deathsData = await d3Fetch.csv(deathsUrl);
  let recoveredData = await d3Fetch.csv(recoveredUrl);

  let actionData = await d3.csv("./lockdown-dates-03-14-2020.csv");
  actionData = processLockdown(actionData);

  let baseData = mergeData(
    confirmedData,
    deathsData,
    recoveredData,
    actionData
  );

  baseData.forEach(d => (d.series = dropCasesUnder(d.series, threshold)));
  baseData = baseData.filter(hasCases);

  const isSelected = makeIsSelected(
    baseData,
    new URLSearchParams(window.location.search)
  );

  let sliderDay = getMaxDays(baseData);
  let yIsLinear = true;

  let data = filterData(baseData, isSelected, sliderDay);

  // Need to add lockdown to data.

  // Set up sizes
  const margin = { top: 50, right: 5, bottom: 60, left: 65 };
  const w = Math.min(window.innerWidth, 800) - margin.left - margin.right;
  const h = Math.min(window.innerHeight, 800) - margin.top - margin.bottom;

  d3.select(".yScaleToggle")
    .selectAll("input")
    .on("change", function() {
      yIsLinear = this.value === "Linear";
      update(data, yIsLinear);
    });

  let yValue = "cases";
  d3.select(".yValue")
    .selectAll("input")
    .on("change", function() {
      yValue = this.value;
      update(data, yIsLinear);
    });

  // Set up axes -- Use function.
  let xScale = d3Scale
    .scaleLinear()
    .domain([0, getMaxDays(data) + 8])
    .range([0, w + margin.right]);
  let xAxis = d3.axisBottom(xScale);

  let yScale = d3Scale
    .scaleLinear()
    .domain(getExtentKey(data, yValue))
    .range([h, 0]);
  let yAxis = d3
    .axisLeft(yScale)
    .ticks(10)
    .tickFormat(d3.format(","));

  const colourScale = d3
    .scaleOrdinal([
      "#ffffff",
      "#ffc604",
      "#ff8b00",
      "#fa8775",
      "#ff0011",
      "#e700af",
      "#e991cd",
      "#a80fff",
      "#0058fc",
      "#4fb136",
      "#bee300"
    ])
    .domain(data.map(d => d["Country/Region"]));

  const line = d3
    .line()
    .x((d, i) => {
      return xScale(i);
    })
    .y(d => yScale(d));

  // Controls
  d3.select("#slider")
    .append("input")
    .attr("type", "range")
    .attr("min", 7)
    .attr("max", getMaxDays(baseData))
    .attr("step", 1)
    .attr("value", getMaxDays(baseData))
    .on("input", function() {
      sliderDay = this.value;
      data = filterData(baseData, isSelected, sliderDay);
      update(data, yIsLinear);
    });

  let orderedData = Object.entries(isSelected).sort((a, b) => {
    if (a[0] > b[0]) {
      return 1;
    } else {
      return -1;
    }
  });

  orderedData = await orderedData.map(pair => {
    let [id, value] = pair;
    return { id: id, text: id, selected: value };
  });

  $(document).ready(function() {
    $(".js-example-basic-multiple").select2({
      placehold: "Choose a region",
      data: orderedData,
      closeOnSelect: false
    });
  });

  $(".js-example-basic-multiple").on("select2:unselect", function(e) {
    let row = e.params.data;
    filterRows(row.text, row.selected);
  });
  $(".js-example-basic-multiple").on("select2:select", function(e) {
    let row = e.params.data;
    filterRows(row.text, row.selected);
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
    .attr("class", "axisLabel")
    .text("Days since >=100 cases.");

  const gY = inner
    .append("g")
    .attr("class", "yAxis")
    .call(yAxis);

  inner
    .append("text")
    .attr("class", "yLabel")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - h / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .attr("class", "axisLabel")
    .text("Cases");

  const graphInner = inner
    .style("-webkit-tap-highlight-color", "transparent")
    .append("g")
    .attr("class", "graphInner");

  update(data, yIsLinear);

  function getScales(data, yLinear) {
    let maxDays = getMaxDays(data);
    let [minY, maxY] = getExtentKey(data, yValue);

    if (yLinear) {
      yScale = d3Scale
        .scaleLinear()
        .domain([minY, maxY])
        .range([h, 0]);
    } else {
      yScale = d3Scale
        .scaleLog()
        .domain([minY, maxY])
        .range([h, 0]);
    }
    yAxis = d3
      .axisLeft(yScale)
      .ticks(10)
      .tickFormat(d3.format(","));

    xScale = d3Scale
      .scaleLinear()
      .domain([0, maxDays])
      .range([0, w + margin.right]);
    xAxis = d3.axisBottom(xScale);

    return [xScale, xAxis, yScale, yAxis];
  }

  function update(data, yLinear) {
    //filter 0 vals if log
    if (!yLinear) {
      data = removeZeros(data, yValue);
    }
    data = data.filter(d => d.series.length > 0);

    [xScale, xAxis, yScale, yAxis] = getScales(data, yLinear);

    maxDays = getMaxDays(data);

    inner
      .select(".yAxis")
      .transition()
      .call(yAxis);

    inner
      .select(".xAxis")
      .transition()
      .call(xAxis);

    if (yValue === "cases") {
      yLabelStr = "Cases";
    } else if (yValue === "deaths") {
      yLabelStr = "Deaths";
    } else if (yValue === "currentCases") {
      yLabelStr = "Current Cases";
    } else if (yValue === "recovered") {
      yLabelStr = "Recovered";
    }
    inner.select(".yLabel").text(yLabelStr);

    // Update searchbar with data here

    // Create new groups here
    const groups = graphInner.selectAll(".countryGroup").data(data, d => d.id);
    groups.exit().remove();

    const genter = groups
      .enter()
      .append("g")
      .attr("class", "countryGroup")
      .attr("id", d => d.id)
      .on("mouseenter", enter)
      .on("mouseleave", exit)
      .on("touchstart", enter)
      .on("touchend", exit);

    genter.append("path").attr("class", "countryLine");
    genter.append("text").attr("class", "countryText");
    genter.append("line").attr("class", "intervention");
    genter.append("text").attr("class", "interventionText");

    subGroups = groups.merge(genter);

    // Line
    subGroups
      .transition()
      .select(".countryLine")
      .attr("fill", "none")
      .attr("stroke", d => colourScale(d["Country/Region"]))
      .attr("d", d => line(d.series.map(v => v[yValue])));

    // Intervention
    subGroups
      .filter(d => {
        return d.series.filter(s => s.event !== null).length > 0;
      })
      .transition()
      .select(".intervention")
      .attr("fill", "none")
      .attr("y1", yScale(yScale.domain()[0]))
      .attr("y2", yScale(yScale.domain()[1]))
      .attr("x1", d => {
        let found = false;
        let idx = null;
        for (let i = 0; i < d.series.length; i++) {
          day = d.series[i];
          if (day.event !== null) {
            idx = i;
            found = true;
            break;
          }
        }
        if (found) {
          return xScale(idx);
        }
      })
      .attr("x2", d => {
        let found = false;
        let idx = null;
        for (let i = 0; i < d.series.length; i++) {
          day = d.series[i];
          if (day.event !== null) {
            found = true;
            idx = i;
            break;
          }
        }
        if (found) {
          return xScale(idx);
        }
      })
      .attr("stroke", d => colourScale(d["Country/Region"]));

    // Intervention text
    subGroups
      .filter(d => {
        return d.series.filter(s => s.event !== null).length > 0;
      })
      .transition()
      .select(".interventionText")
      .attr("x", d => {
        let found = false;
        let idx = null;
        for (let i = 0; i < d.series.length; i++) {
          day = d.series[i];
          if (day.event !== null) {
            idx = i;
            found = true;
            break;
          }
        }
        if (found) {
          return xScale(idx);
        }
      })
      .attr("y", d => {
        return yScale(yScale.domain()[1] / 2);
      })
      .attr("transform", d => {
        let found = false;
        let idx = null;
        for (let i = 0; i < d.series.length; i++) {
          day = d.series[i];
          if (day.event !== null) {
            idx = i;
            found = true;
            break;
          }
        }
        if (found) {
          x = xScale(idx);
        }

        y = yScale(yScale.domain()[1] / 2);
        return `rotate(-90, ${x}, ${y})`;
      })
      .attr("fill", d => colourScale(d["Country/Region"]))
      .attr("dy", "+1.1em")
      .attr("text-anchor", "middle")
      .text(d => `${d.name} (Lock Down)`);

    //Country text
    subGroups
      .transition()
      .select(".countryText")
      .attr("x", d => {
        let lastPos = xScale(d.series.length - 1);
        if (w - lastPos < 100) {
          return w - 100;
        }
        return lastPos;
      })
      .attr("y", d => {
        return yScale(d.series[d.series.length - 1][yValue]);
      })
      .attr("dy", "-1em")
      .attr("fill", d => colourScale(d["Country/Region"]))
      .text(d => d.name);
  }

  function filterRows(key, value) {
    let params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, true);
    } else {
      params.delete(key);
    }

    isSelected[key] = value;
    data = filterData(baseData, isSelected, sliderDay);
    update(data, yIsLinear);

    window.history.replaceState({}, "", `${location.pathname}?${params}`);
  }
};

function enter(d, i) {
  d3.select(this)
    .select("path")
    .classed("hoverHighlighted", true);
  d3.select(this)
    .select("line")
    .classed("hoverHighlighted", true);
  d3.select(this)
    .selectAll("text")
    .classed("hoverHighlighted", true);
}

function exit(d, i) {
  d3.select(this)
    .select("line")
    .classed("hoverHighlighted", false);
  d3.select(this)
    .select("path")
    .classed("hoverHighlighted", false);
  d3.select(this)
    .selectAll("text")
    .classed("hoverHighlighted", false);
}

main();
