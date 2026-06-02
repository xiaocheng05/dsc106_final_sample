let currentSlide = 0;
let slides;
let totalSlides;
let isTransitioning = false;

const prevSlideBtn = document.getElementById("prevSlideBtn");
const nextSlideBtn = document.getElementById("nextSlideBtn");

function updateNavigationButtons() {
  prevSlideBtn.disabled = currentSlide === 0;
  nextSlideBtn.disabled = currentSlide === slides.length - 1;
}

function resetTypewriters(slide) {
  slide.querySelectorAll(".typewriter").forEach((el) => {
    if (el._typingTimeout) clearTimeout(el._typingTimeout);
    el._typingTimeout = null;
    const textElement = el.querySelector(".typewriter-text");
    if (textElement) textElement.textContent = "";
  });
}

function typewriterEffect(element, speed = 38) {
  const text = element.getAttribute("data-text") || "";
  const textElement = element.querySelector(".typewriter-text");
  if (!textElement) return;
  if (element._typingTimeout) clearTimeout(element._typingTimeout);
  textElement.textContent = "";
  let i = 0;
  function type() {
    if (i < text.length) {
      textElement.textContent += text.charAt(i++);
      element._typingTimeout = setTimeout(type, speed);
    }
  }
  type();
}

function triggerTypewriterInSlide(slide) {
  slide.querySelectorAll(".typewriter").forEach((el) => typewriterEffect(el));
}

function updateSlide() {
  slides.forEach((slide, index) => {
    slide.classList.remove("active", "prev", "next");
    resetTypewriters(slide);
    if (index === currentSlide) {
      slide.classList.add("active");
      triggerTypewriterInSlide(slide);
    } else if (index < currentSlide) slide.classList.add("prev");
    else slide.classList.add("next");
  });
  document.querySelectorAll(".indicator-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide);
  });
  updateNavigationButtons();
}

function goToSlide(index) {
  if (index === currentSlide || isTransitioning) return;
  isTransitioning = true;
  currentSlide = Math.max(0, Math.min(totalSlides - 1, index));
  updateSlide();
  setTimeout(() => (isTransitioning = false), 250);
}
function nextSlide() { if (currentSlide < totalSlides - 1) goToSlide(currentSlide + 1); }
function previousSlide() { if (currentSlide > 0) goToSlide(currentSlide - 1); }

document.addEventListener("DOMContentLoaded", () => {
  slides = document.querySelectorAll(".slide");
  totalSlides = slides.length;
  const indicatorContainer = document.getElementById("slide-indicator");
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement("div");
    dot.className = "indicator-dot" + (i === 0 ? " active" : "");
    dot.addEventListener("click", () => goToSlide(i));
    indicatorContainer.appendChild(dot);
  }
  prevSlideBtn.addEventListener("click", previousSlide);
  nextSlideBtn.addEventListener("click", nextSlide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextSlide(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); previousSlide(); }
  });
  document.querySelector(".slides-container").addEventListener("click", (e) => {
    if (e.target.closest("button,select,input,svg,.indicator-dot,.chart-container,.globe-shell,.info-panel,.impact-panel")) return;
    if (e.clientX < window.innerWidth / 2) previousSlide(); else nextSlide();
  });
  updateSlide();
  loadClimateData();
});

const fmt = d3.format(".3f");
const fmt2 = d3.format(".2f");
const fmtDelta = d3.format("+.3f");
const parse = (d) => { for (const k in d) if (k !== "country") d[k] = +d[k]; return d; };

function loadClimateData() {
  Promise.all([
    d3.csv("global_yearly.csv", parse),
    d3.csv("grid_sample.csv", parse),
    d3.csv("country_year.csv", parse),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  ]).then(([globalData, gridData, countryData, world]) => {
    const countries = topojson.feature(world, world.objects.countries).features;
    const years = globalData.map((d) => d.year);
    const minYear = d3.min(years), maxYear = d3.max(years);
    const globalByYear = new Map(globalData.map((d) => [d.year, d]));
    const gridByYear = d3.group(gridData, (d) => d.year);
    const countryRows = d3.group(countryData, (d) => d.country);
    const countryNames = Array.from(countryRows.keys()).sort(d3.ascending);
    let currentYear = minYear;
    let selectedCountry = countryNames.includes("China") ? "China" : countryNames[0];
    let timer = null;

    setupCountrySelect(countryNames);
    buildGlobe(countries, gridData, gridByYear);
    drawGlobalTrend(globalData);
    drawRanking(countryData);
    updateYear(currentYear);
    selectCountry(selectedCountry);

    d3.select("#yearSlider")
      .attr("min", minYear)
      .attr("max", maxYear)
      .on("input", (e) => updateYear(+e.target.value));

    d3.select("#playBtn").on("click", () => {
      if (timer) { timer.stop(); timer = null; d3.select("#playBtn").text("Play"); return; }
      d3.select("#playBtn").text("Pause");
      timer = d3.interval(() => updateYear(currentYear >= maxYear ? minYear : currentYear + 1), 180);
    });
    d3.select("#prevCountry").on("click", () => moveCountry(-1));
    d3.select("#nextCountry").on("click", () => moveCountry(1));

    function setupCountrySelect(names) {
      d3.select("#countrySelect").selectAll("option").data(names).join("option").attr("value", (d) => d).text((d) => d);
      d3.select("#countrySelect").on("change", (e) => selectCountry(e.target.value));
    }
    function moveCountry(step) {
      const i = countryNames.indexOf(selectedCountry);
      selectCountry(countryNames[(i + step + countryNames.length) % countryNames.length]);
      goToSlide(3);
    }
    function updateYear(year) {
      currentYear = year;
      d3.select("#yearLabel").text(year);
      d3.select("#sideYear").text(year);
      d3.select("#yearSlider").property("value", year);
      const g = globalByYear.get(year);
      if (g) {
        d3.select("#globalAod").text(fmt(g.od550aer));
        d3.select("#globalTas").text(`${fmt2(g.tas_anomaly)} °C`);
        d3.select("#globalPr").text(`${fmt(g.pr_anomaly)} mm/day`);
      }
      if (window.updateGlobePoints) window.updateGlobePoints();
    }

    function buildGlobe(countries, allGrid, byYear) {
      const svg = d3.select("#globe");
      const width = 860, height = 620;
      const projection = d3.geoOrthographic().scale(290).translate([width / 2, height / 2]).clipAngle(90).precision(0.6);
      const path = d3.geoPath(projection);
      const color = d3.scaleSequential(d3.interpolateYlOrBr).domain(d3.extent(allGrid, (d) => d.od550aer));
      svg.append("path").datum({ type: "Sphere" }).attr("class", "sphere").attr("d", path);
      svg.append("path").datum(d3.geoGraticule10()).attr("class", "graticule").attr("d", path);
      const countryLayer = svg.append("g");
      const pointLayer = svg.append("g");
      countryLayer.selectAll("path").data(countries).join("path")
        .attr("class", "country")
        .attr("d", path)
        .on("mousemove", (event, d) => showTooltip(event, d.properties.name || "Country"))
        .on("mouseleave", hideTooltip)
        .on("click", (event, d) => {
          const resolved = resolveName(d.properties.name);
          if (resolved) { selectCountry(resolved); goToSlide(3); }
        });
      svg.call(d3.drag().on("drag", (event) => {
        const r = projection.rotate();
        projection.rotate([r[0] + event.dx * 0.35, r[1] - event.dy * 0.35]);
        svg.selectAll("path.country").attr("d", path);
        svg.select(".graticule").attr("d", path);
        window.updateGlobePoints();
      }));
      window.updateGlobePoints = function () {
        const rows = byYear.get(currentYear) || [];
        pointLayer.selectAll("circle").data(rows, (d) => `${d.lat},${d.lon}`).join("circle")
          .attr("class", "aod-point").attr("r", 2.4).attr("fill", (d) => color(d.od550aer))
          .attr("cx", (d) => { const p = projection([fixLon(d.lon), d.lat]); return p ? p[0] : -999; })
          .attr("cy", (d) => { const p = projection([fixLon(d.lon), d.lat]); return p ? p[1] : -999; })
          .attr("display", (d) => d3.geoDistance([fixLon(d.lon), d.lat], [-projection.rotate()[0], -projection.rotate()[1]]) > Math.PI / 2 ? "none" : null);
      };
      window.redrawActiveCountry = () => svg.selectAll(".country").classed("active", (d) => resolveName(d.properties.name) === selectedCountry);
    }

    function resolveName(name) {
      if (countryRows.has(name)) return name;
      const aliases = {"Dem. Rep. Congo":"Democratic Republic of the Congo","Congo":"Republic of the Congo","Côte d’Ivoire":"Ivory Coast","Côte d'Ivoire":"Ivory Coast","S. Sudan":"South Sudan","Central African Rep.":"Central African Republic","Dominican Rep.":"Dominican Republic","Bosnia and Herz.":"Bosnia and Herzegovina","Eq. Guinea":"Equatorial Guinea","eSwatini":"Eswatini"};
      if (aliases[name] && countryRows.has(aliases[name])) return aliases[name];
      const lower = (name || "").toLowerCase();
      return countryNames.find((d) => d.toLowerCase() === lower) || null;
    }
    function fixLon(lon) { return lon > 180 ? lon - 360 : lon; }

    function selectCountry(country) {
      selectedCountry = country;
      d3.select("#countrySelect").property("value", country);
      d3.select("#countryTitle").text(country);
      if (window.redrawActiveCountry) window.redrawActiveCountry();
      const rows = countryRows.get(country).slice().sort((a, b) => a.year - b.year);
      const early = rows.filter((d) => d.year <= d3.min(rows, (x) => x.year) + 9);
      const late = rows.filter((d) => d.year >= d3.max(rows, (x) => x.year) - 9);
      const deltaAod = d3.mean(late, (d) => d.od550aer) - d3.mean(early, (d) => d.od550aer);
      const deltaTas = d3.mean(late, (d) => d.tas_c) - d3.mean(early, (d) => d.tas_c);
      const deltaPr = d3.mean(late, (d) => d.pr_mm_day) - d3.mean(early, (d) => d.pr_mm_day);
      const r1 = corr(rows.map((d) => d.od550aer), rows.map((d) => d.tas_c));
      const r2 = corr(rows.map((d) => d.tas_c), rows.map((d) => d.pr_mm_day));
      d3.select("#deltaAod").text(fmtDelta(deltaAod));
      d3.select("#deltaTas").text(`${fmtDelta(deltaTas)} °C`);
      d3.select("#deltaPr").text(`${fmtDelta(deltaPr)} mm/day`);
      d3.select("#corrAodTemp").text(fmt2(r1));
      d3.select("#corrTempPr").text(fmt2(r2));
      d3.select("#countryMeaning").text(`${country} is compared across ${rows[0].year}–${rows[rows.length - 1].year}. The cards show how the late-period average differs from the early-period average.`);
      const tone = Math.abs(r1) > 0.45 ? "stronger" : Math.abs(r1) > 0.2 ? "moderate" : "weak";
      d3.select("#interpretationText").text(`In ${country}, the aerosol-temperature association is ${tone} (r = ${fmt2(r1)}). Precipitation is usually noisier than temperature, so the second correlation should be read as a pattern to investigate rather than proof of direct causation.`);
      drawCountryTimeline(rows);
      drawScatter("#aodTemp", rows, "od550aer", "tas_c", "od550aer", "Temperature (°C)", "#f6ae2d");
      drawScatter("#tempPr", rows, "tas_c", "pr_mm_day", "Temperature (°C)", "Precipitation (mm/day)", "#2e86ab");
    }

    function drawCountryTimeline(rows) {
      const svg = d3.select("#countryTimeline"); svg.selectAll("*").remove();
      const { w, h, m } = box(svg, 900, 430);
      const x = d3.scaleLinear().domain(d3.extent(rows, (d) => d.year)).range([m.left, w - m.right]);
      const series = [
        { key: "od550aer", label: "od550aer", color: "#f6ae2d" },
        { key: "tas_c", label: "temperature", color: "#e53935" },
        { key: "pr_mm_day", label: "precipitation", color: "#2e86ab" },
      ].map((s) => {
        const scale = d3.scaleLinear().domain(d3.extent(rows, (d) => d[s.key])).range([0, 1]);
        return { ...s, values: rows.map((d) => ({ year: d.year, value: scale(d[s.key]) })) };
      });
      const y = d3.scaleLinear().domain([0, 1]).range([h - m.bottom, m.top]);
      axes(svg, x, y, w, h, m, true);
      series.forEach((s) => svg.append("path").datum(s.values).attr("class", "line").attr("stroke", s.color).attr("d", d3.line().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX)));
      legend(svg, series, m.left, m.top - 18);
      label(svg, "Normalized within selected country", m.left, m.top + 22);
    }

    function drawGlobalTrend(data) {
      const svg = d3.select("#globalTrend"); svg.selectAll("*").remove();
      const { w, h, m } = box(svg, 620, 340);
      const x = d3.scaleLinear().domain(d3.extent(data, (d) => d.year)).range([m.left, w - m.right]);
      const keys = [
        { key: "od550aer", label: "od550aer", color: "#f6ae2d" },
        { key: "tas_anomaly", label: "temp anomaly", color: "#e53935" },
        { key: "pr_anomaly", label: "precip anomaly", color: "#2e86ab" },
      ];
      const y = d3.scaleLinear().domain([0, 1]).range([h - m.bottom, m.top]);
      axes(svg, x, y, w, h, m, true);
      keys.forEach((s) => {
        const sc = d3.scaleLinear().domain(d3.extent(data, (d) => d[s.key])).range([0, 1]);
        svg.append("path").datum(data).attr("class", "line").attr("stroke", s.color).attr("d", d3.line().x((d) => x(d.year)).y((d) => y(sc(d[s.key]))).curve(d3.curveMonotoneX));
      });
      legend(svg, keys, m.left, m.top - 18);
    }

    function drawRanking(data) {
      const grouped = Array.from(d3.group(data, (d) => d.country), ([country, rows]) => {
        rows = rows.sort((a, b) => a.year - b.year);
        const early = rows.filter((d) => d.year <= d3.min(rows, (x) => x.year) + 9);
        const late = rows.filter((d) => d.year >= d3.max(rows, (x) => x.year) - 9);
        return { country, delta: d3.mean(late, (d) => d.od550aer) - d3.mean(early, (d) => d.od550aer) };
      }).sort((a, b) => d3.descending(a.delta, b.delta)).slice(0, 18);
      const svg = d3.select("#rankingChart"); svg.selectAll("*").remove();
      const { w, h, m } = box(svg, 1120, 620);
      const x = d3.scaleLinear().domain([0, d3.max(grouped, (d) => d.delta)]).nice().range([m.left, w - m.right]);
      const y = d3.scaleBand().domain(grouped.map((d) => d.country)).range([m.top, h - m.bottom]).padding(0.22);
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h - m.bottom})`).call(d3.axisBottom(x).ticks(6));
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y));
      svg.selectAll("rect").data(grouped).join("rect")
        .attr("x", m.left).attr("y", (d) => y(d.country)).attr("height", y.bandwidth()).attr("width", (d) => x(d.delta) - m.left)
        .attr("rx", 5).attr("fill", "#f6ae2d").style("cursor", "pointer")
        .on("click", (e, d) => { selectCountry(d.country); goToSlide(3); });
      label(svg, "Increase in od550aer: late decade minus early decade", m.left, h - 8);
    }

    function drawScatter(selector, data, xKey, yKey, xLab, yLab, color) {
      const svg = d3.select(selector); svg.selectAll("*").remove();
      const { w, h, m } = box(svg, 620, 340);
      const x = d3.scaleLinear().domain(d3.extent(data, (d) => d[xKey])).nice().range([m.left, w - m.right]);
      const y = d3.scaleLinear().domain(d3.extent(data, (d) => d[yKey])).nice().range([h - m.bottom, m.top]);
      axes(svg, x, y, w, h, m, false);
      svg.selectAll("circle").data(data).join("circle").attr("class", "point").attr("cx", (d) => x(d[xKey])).attr("cy", (d) => y(d[yKey])).attr("r", 3.8).attr("fill", color);
      label(svg, xLab, w / 2, h - 8, "middle");
      label(svg, yLab, m.left, m.top - 10);
    }

    function axes(svg, x, y, w, h, m, yearTicks) {
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h - m.bottom})`).call(d3.axisBottom(x).ticks(6).tickFormat(yearTicks ? d3.format("d") : undefined));
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5));
      svg.append("g").attr("class", "grid").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.left - m.right)).tickFormat("")).selectAll("line").attr("class", "grid-line");
    }
    function box(svg, w = 620, h = 340) { svg.attr("viewBox", `0 0 ${w} ${h}`); return { w, h, m: { top: 44, right: 28, bottom: 48, left: 64 } }; }
    function label(svg, text, x, y, anchor = "start") { svg.append("text").attr("class", "chart-label").attr("x", x).attr("y", y).attr("text-anchor", anchor).text(text); }
    function legend(svg, items, x, y) { const g = svg.append("g").attr("class", "legend").attr("transform", `translate(${x},${y})`); items.forEach((s, i) => { const e = g.append("g").attr("transform", `translate(${i * 150},0)`); e.append("circle").attr("r", 5).attr("fill", s.color); e.append("text").attr("x", 12).attr("y", 4).text(s.label); }); }
    function corr(a, b) { const ma = d3.mean(a), mb = d3.mean(b); const num = d3.sum(a, (v, i) => (v - ma) * (b[i] - mb)); const den = Math.sqrt(d3.sum(a, (v) => (v - ma) ** 2) * d3.sum(b, (v) => (v - mb) ** 2)); return den ? num / den : 0; }
    function showTooltip(event, html) { d3.select("#tooltip").classed("hidden", false).style("left", `${event.offsetX + 14}px`).style("top", `${event.offsetY + 14}px`).html(html); }
    function hideTooltip() { d3.select("#tooltip").classed("hidden", true); }
  });
}
