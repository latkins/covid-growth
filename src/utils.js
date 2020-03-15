import * as d3 from "d3";

const hasCases = row => {
  return row.cases.filter(d => d.count > 0).length > 0;
};

const getNDays = data => {
  let max = 0;
  for (const row of data) {
    if (row.cases.length > max) {
      max = row.cases.length;
    }
  }
  return max;
};

const getMaxCases = (data, maxDay) => {
  let max = 0;
  for (const row of data) {
    for (let i = 0; i < maxDay; i++) {
      if (i < row.cases.length) {
        let day = row.cases[i];
        if (day.count > max) {
          max = day.count;
        }
      }
    }
  }
  return max;
};

const tidyData = row => {
  const newRow = {};
  const dailyCases = [];
  const keys = ["Country/Region", "Lat", "Long", "Province/State"];
  const parseDate = d3.timeParse("%m/%d/%y");
  for (const [key, value] of Object.entries(row)) {
    if (keys.includes(key)) {
      newRow[key] = value;
    } else {
      dailyCases.push({ date: parseDate(key), count: parseInt(value) });
    }
  }
  newRow["cases"] = dailyCases.sort((a, b) => a.date - b.date);
  const geoUnit = newRow["Country/Region"];
  const subGeoUnit = newRow["Province/State"];
  let name;
  if (geoUnit === subGeoUnit || subGeoUnit === "") {
    name = geoUnit;
  } else {
    name = `${subGeoUnit}, ${geoUnit}`;
  }
  newRow["name"] = name;

  return newRow;
};

const dropCasesUnder = (cases, threshold) => {
  // Drop days until first case >= threshold
  // Assumes cases are in ascending date order.
  for (let i = 0; i < cases.length; i++) {
    if (cases[i].count > threshold) {
      return cases.slice(i);
    }
  }
  return [];
};

const makeIsSelected = (data, urlSelected) => {
  const isSelected = {};

  for (const row of data) {
    isSelected[row.name] = false;
  }

  for (const key of urlSelected.keys()) {
    isSelected[key] = true;
  }

  return isSelected;
};

export {
  hasCases,
  getNDays,
  getMaxCases,
  tidyData,
  dropCasesUnder,
  makeIsSelected
};
