import React, {Component} from "react";
import {Grid, Row, Col, ToggleButtonGroup, ToggleButton} from "react-bootstrap";
import {TableMode} from "./tablemode.jsx";
import Plot from "react-plotly.js";
import {format} from "d3";

export class DistributionView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: "graph",
    };

    this.onResize = () => {
      this.setState({plotWidth: 0.75 * window.innerWidth});
    };

    this.formatCount = (count) => {
      // For values with fewer than four digits, just display the value. For
      // values with more than four digits, show three sig figs and a suffix.
      return count < 1000 ? count : format(".3s")(count);
    };

    this.makePlotly = (data) => {
      let plotlyData = {
        type: "bar",
        x: [],
        y: [],
        text: [],
        customdata: [],
        hoverinfo: "y+text",
      };

      for (let {start, label, proportion, count, end} of data) {
        let x;
        let text;
        if (label) {
          x = label;
          text = `${label} - ${this.formatCount(count)} clients`;
        } else {
          x = start;
          text = `[${start}, ${end-1}) - ${this.formatCount(count)} clients`;
        }
        plotlyData.x.push(x);
        plotlyData.text.push(text);
        plotlyData.y.push(proportion);
        plotlyData.customdata.push(count);
      }

      return plotlyData;
    };
  }

  handleChange = (event) => {
    this.setState({mode : event,});
  }

  componentDidMount() {
    window.addEventListener("resize", this.onResize);
    this.onResize();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
  }

  render() {
    let mean = this.props.dataStore.mean.toFixed(2);
    let metric = this.props.dataStore.active.metric;
    let data = this.props.dataStore.active.data;

    const BOOL_MEASURES = [
      'scalars_devtools_onboarding_is_devtools_user',
    ];

    let plotData;
    let plotDataGrouped;
    let plotDataStacked2;
    if (BOOL_MEASURES.includes(metric)) {
      // need to calculate "sometimes true" and "sometimes false" data
      const neverCount = data[0].count;
      const neverProp = data[0].proportion;
      const alwaysCount = data[1].count;
      const alwaysProp = data[1].proportion;
      const totalCount = Math.ceil(neverCount / neverProp);
      data = [...data, {
        start: 2,
        end: null,
        label: "sometimes",
        count: totalCount - neverCount - alwaysCount,
        proportion: 1 - neverProp - alwaysProp,
      }];
      plotData = data.map(datum => {
        let plotDatum = this.makePlotly([datum]);
        plotDatum.name = datum.label;
        plotDatum.x[0] = metric;
        return plotDatum;
      });
      const sometimesTrue = {
        start: 2,
        end: null,
        label: "sometimes true",
        count: totalCount - neverCount,
        proportion: 1 - neverProp,
      };
      const sometimesFalse = {
        start: 3,
        end: null,
        label: "sometimes false",
        count: totalCount - alwaysCount,
        proportion: 1 - alwaysProp,
      };
      plotDataGrouped = [
        {
          ...this.makePlotly(data),
          x: ["false", "true"],
          name: "always",
          marker: {
            color: "#ff7f0e", // plotly orange
          },
        },
        {
          ...this.makePlotly([sometimesTrue, sometimesFalse]),
          x: ["true", "false"],
          name: "sometimes",
          marker: {
            color: "#1f77b4", // plotly blue
          },
        },
      ];
      plotDataStacked2 = plotDataGrouped;
    } else {
      plotData = plotDataGrouped = plotDataStacked2 = [this.makePlotly(data)];
    }

    return (
      <Grid  className="distribution view" fluid>
        <Row>
          <Col>
            <i className="fas fa-info-circle"></i> The distribution view displays the distribution of user outcomes as a histogram.
            <div>Hover over a point on the graph to view a specific value.</div>
            <div>Or, switch to table mode below to see a list of all absolute values.</div>
          </Col>
        </Row>
        <Row>
          <ToggleButtonGroup
            name="mode-options"
            id="selector"
            type="radio"
            value={this.state.mode}
            onChange={this.handleChange}
          >
            <ToggleButton value="graph">Graph</ToggleButton>
            <ToggleButton value="table">Table</ToggleButton>
          </ToggleButtonGroup>
        </Row>
        <Row>
          {this.state.mode === "graph" &&
            <Plot
              data={plotData}
              layout={ {
                type: "bar",
                title: metric,
                width: this.state.plotWidth,
                barmode: 'stack',
                xaxis: {
                  type: "category",
                  title: metric,
                },
                yaxis: {
                  title: "Proportion of Users",
                  hoverformat: ".3p",
                  tickformat: ".3p",
                },
              } }
            />
          }
          {this.state.mode === "table" &&
            <TableMode
              activeMetric = {metric}
              currentData = {data}
            />
          }
        </Row>
        <Row>
          <Plot
            data={plotDataGrouped}
            layout={ {
              type: "bar",
              title: metric,
              width: this.state.plotWidth,
              barmode: 'group',
              xaxis: {
                type: "category",
                title: metric,
              },
              yaxis: {
                title: "Proportion of Users",
                hoverformat: ".3p",
                tickformat: ".3p",
              },
            } }
          />
        </Row>
        <Row>
          <Plot
            data={plotDataStacked2}
            layout={ {
              type: "bar",
              title: metric,
              width: this.state.plotWidth,
              barmode: 'stack',
              xaxis: {
                type: "category",
                title: metric,
              },
              yaxis: {
                title: "Proportion of Users",
                hoverformat: ".3p",
                tickformat: ".3p",
              },
            } }
          />
        </Row>
        <Row>
          <p>Mean: {mean}</p>
        </Row>
      </Grid>
    );
  }
}
