(function(){

  var tree = raw.models.customTree();

  var chart = raw.chart()
    .title('Test')
    .description(
      "AAA space filling visualization of data hierarchies and proportion between elements. The different hierarchical levels create visual clusters through the subdivision into rectangles proportionally to each element's value. Treemaps are useful to represent the different proportion of nested hierarchical data structures.<br/>Based on <a href='http://bl.ocks.org/mbostock/4063582'>http://bl.ocks.org/mbostock/4063582</a>")
    .thumbnail("/raw/imgs/treemap.png")
    .category('Hierarchies')
    .model(tree)

  var rawWidth = chart.number()
    .title('Width')
    .defaultValue(100)
    .fitToWidth(true)

  var rawHeight = chart.number()
    .title("Height")
    .defaultValue(500)

  var padding = chart.number()
    .title("Padding")
    .defaultValue(0)

  var colors = chart.color()
    .title("Color scale")

  chart.draw(function (selection, data){
    data.name = 'Zoomable Tree'

    var margin = {top: 30, right: 0, bottom: 20, left: 0},
      width =  +rawWidth() -25,
      height = +rawHeight() - margin.top - margin.bottom,
      formatNumber = d3.format(",d"), // changed add d
      transitioning;

    // sets x and y scale to determine size of visible boxes
    var x = d3.scaleLinear()
      .domain([0, width])
      .range([0, width]);

    var y = d3.scaleLinear()
      .domain([0, height])
      .range([0, height]);

    var treemap = d3.treemap()
      .size([width, height])
      .padding(0)
      .round(false)
      //.tile(d3.treemapSquarify);

    var svg = selection
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
      .style("margin-left", -margin.left + "px")
      .style("margin.right", -margin.right + "px")
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .style("shape-rendering", "crispEdges");

    var grandparent = svg.append("g")
      .attr("class", "grandparent");

    grandparent.append("rect")
      .attr("y", -margin.top)
      .attr("width", width)
      .attr("height", margin.top)
      //.attr("fill", '#bbbbbb');
      .attr("fill", '#14d16c');

    grandparent.append("text")
      .attr("x", 6)
      .attr("y", 6 - margin.top)
  .attr("dy", ".75em");
    /* var year = 2016;
    var abs_in_year = function (year, values) {
      val = values.filter(function (el) {
        var key = parseInt(Object.keys(el));
        return (key === year);
      })[0][year]['abs'];
      return val;
    }; */
    var root = d3.hierarchy(data);
    console.log('data', data)
    console.log('hirearchy', root)
    treemap(root
      .sum(function(d) { return 1; })
      .sort(function(a, b) { return a.value - b.value; })
    );
    display(root);

    function display(d) {
      console.log('dimensions: ', tree.dimensions())
      console.log('hier: ', tree.dimensions().hierarchy)
      // write text into grandparent
      // and activate click's handler
      grandparent
        .datum(d.parent)
        .on("click", transition)
        .select("text")
        .text(breadcrumbs(d));

      // grandparent color
      grandparent
        .datum(d.parent)
        .select("rect")
        .attr("fill", function () {
          // return '#bbbbbb'
          return '#14d16c'
        });

      var g1 = svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

      var g = g1.selectAll("g")
        .data(d.children)
        .enter()
        .append("g");

      // add class and click handler to all g's with children
      g.filter(function (d) {
        // console.log('clicked', d)
        return d.children;
      })
        .attr("class", "children")
        .style("cursor", "pointer")
        .on("click", transition);

      // Create rectangle for all children
      g.selectAll(".child")
        .data(function (d) {
          // console.log('my chidrenene', d)
          return d.children || [d];
        })
        .enter()
        .append("rect")
        .attr("class", "child")
        .call(rect);

      // add title to parents
      g.append("rect")
        .attr("class", "parent")
        .call(rect)
        .append("title")
        .text(function (d){
          return name(d);
        });

      /* Adding a foreign object instead of a text object, allows for text wrapping */
      g.append("foreignObject")
        .call(rect)
        .attr("class", "foreignobj")
        .append("xhtml:div")
        .attr("title", function(d) {
          return name(d);
        })
        .html(function (d) {
          return '' +
            '<p class="title">' + name(d) + '</p>'
            //+ '<p>' + formatNumber(d.value) + '</p>'
            ;
        })
        .attr("class", "textdiv"); //textdiv class allows us to style the text easily with CSS

      // Create rectangle for all children who have no children to put inside elements
      console.log('a', d)
      if (d.depth === 2) {
        console.log('b', d)

        // Create all inside Elements rectangle
        var selectionInsideElements = g1.selectAll("g")
          .insert('g', '.foreignObject')
          .data(function (d) {
            console.log('oooop', d)
            return d.children
          })
          .attr('class', 'insideElements')

        var selectionRectInsideElements = selectionInsideElements.selectAll('.insideElements')
          .data(function (d) {
            console.log('inside', d)
            return d.data.insideElements.map((el, i) => {
              return {
                nameInsideElement: el,
                x0: d.x0 + i * (d.x1 - d.x0) / d.data.insideElements.length,
                x1: d.x0 + (i + 1) * (d.x1 - d.x0) / d.data.insideElements.length,
                y0: d.y0 + (1 / 3) * (d.y1 - d.y0),
                y1: d.y1,
                x: d.x0 + i * (d.x1 - d.x0) / d.data.insideElements.length,
                y: (d.y0 + (1 / 3) * (d.y1 - d.y0)) + (5/100) * (d.y1 - (d.y0 + (1 / 3) * (d.y1 - d.y0)))
              }
            })
          })
          .enter()

        selectionRectInsideElements.append("rect")
        .attr("class", "rectInsideElement")

        selectionRectInsideElements.append("text")
          .text(function (d) { return nameInsideElement(d)})
      }

      function transition(d) {
        if (transitioning || !d) return;
        transitioning = true;
        var g2 = display(d),
          t1 = g1.transition().duration(650),
          t2 = g2.transition().duration(650);

        // Update the domain only after entering new elements.
        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);

        // Enable anti-aliasing during the transition.
        svg.style("shape-rendering", null);

        // Draw child nodes on top of parent nodes.
        svg.selectAll(".depth").sort(function (a, b) {
          return a.depth - b.depth;
        });

        // Fade-in entering text.
        g2.selectAll("text").style("fill-opacity", 0);
        g2.selectAll("foreignObject div").style("display", "none");

        /*added*/
        // Transition to the new view.
        t1.selectAll("text").call(text).style("fill-opacity", 0);
        t2.selectAll("text").call(text).style("fill-opacity", 1);
        t1.selectAll("rect:not(.insideElement)").call(rect);
        t2.selectAll("rect:not(.insideElement)").call(rect);
        /* t1.selectAll('.insideElement')
          .call(createInsideElement);
        t2.selectAll('.insideElement')
          .call(createInsideElement); */
        t1.selectAll('.rectInsideElement')
          .call(rect);
        t2.selectAll('.rectInsideElement')
          .call(rect);
        /* Foreign object */
        t1.selectAll(".textdiv").style("display", "none");
        /* added */
        t1.selectAll(".foreignobj").call(foreign);
        /* added */
        t2.selectAll(".textdiv").style("display", "block");
        /* added */
        t2.selectAll(".foreignobj").call(foreign);
        /* added */
        // Remove the old node when the transition is finished.
        t1.on("end.remove", function(){
          this.remove();
          transitioning = false;
        });
      }
      return g;
    }

    function text(text) {
      // TODO : sans doute un problème ici sur la redéfinition des x et y
      text.attr("x", function (d) {
        console.log('data', d)
        console.log('data xdx', x(d.x))
        return x(d.x) + 6;
      })
        .attr("y", function (d) {
          return y(d.y) + 6;
        });
    }

    function rect(rect) {
      rect
        .attr("x", function (d) {
          /* console.log('coucocu', d.x0)
          console.log(d.x1)
          console.log(d.y0)
          console.log(d.y1)
          console.log(x(d.x0))
          console.log(x(d.x1))
          console.log(y(d.y0))
          console.log(y(d.y1)) */
          return x(d.x0);
        })
        .attr("y", function (d) {
          return y(d.y0);
        })
        .attr("width", function (d) {
          return x(d.x1) - x(d.x0);
        })
        .attr("height", function (d) {
          return y(d.y1) - y(d.y0);
        })
        .attr("fill", function (d) {
          // return '#bbbbbb';
          return '#14d16c'
        });
    }

    function createInsideElement(el) {
      // In each function, d is an element of the current selection
      // ie. in this code, it is the selection when 'call' is used
      el
        .attr('x', function(d) {
          return x(d.x0) + (x(d.x1) - x(d.x0))/3;
        })
        .attr('y', function(d) {
          return y(d.y0) + Math.abs(y(d.y0) - y(d.y1))/3;
        })
        .attr("width", function (d) {
          return (x(d.x1) - x(d.x0))/3;
        })
        .attr("height", function (d) {
          return (y(d.y1) - y(d.y0))/3;
        })
        .attr("fill", function (d) {
          // return '#bbbbbb';
          return '#FF0000'
        });
    }

    function createInsideElementRect(el) {
      // In each function, d is an element of the current selection
      // ie. in this code, it is the selection when 'call' is used
      el
        .attr('x', function(d) {
          return x(d.x0) + (x(d.x1) - x(d.x0))/3;
        })
        .attr('y', function(d) {
          return y(d.y0) + Math.abs(y(d.y0) - y(d.y1))/3;
        })
        .attr("width", function (d) {
          return (x(d.x1) - x(d.x0))/3;
        })
        .attr("height", function (d) {
          return (y(d.y1) - y(d.y0))/3;
        })
        .attr("fill", function (d) {
          // return '#bbbbbb';
          return '#FF0000'
        });
    }

    function foreign(foreign) { /* added */
      foreign
        .attr("x", function (d) {
          return x(d.x0);
        })
        .attr("y", function (d) {
          return y(d.y0);
        })
        .attr("width", function (d) {
          return x(d.x1) - x(d.x0);
        })
        .attr("height", function (d) {
          return y(d.y1) - y(d.y0);
        });
    }

    function name(d) {
      return d.data.name;
    }

    // Return the name of the ith inside element
    function nameInsideElement (d) {
      console.log('data', d)
      console.log('name', d.nameInsideElement)
      return d.nameInsideElement;
    }

    function breadcrumbs(d) {
      var res = "";
      var sep = " > ";
      d.ancestors().reverse().forEach(function(i){
        res += name(i) + sep;
      });
      res = res
        .split(sep)
        .filter(function(i){
          return i!== "";
        })
        .join(sep);
      return res +
        (d.parent
          ? " -  Click to zoom out"
          : " - Click inside square to zoom in");
    };
  })
})();