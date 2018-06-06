(function(){

  var tree = raw.models.tree();

  tree.dimension('insideElements')
    .title('Inside Elements')
    .types(String)

  tree.dimension('colorInsideElements')
    .title('Color of Inside Elements')
    .types(Number)

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

  chart.draw(function (selection, root){

    root.name = 'ZoomableTree';

    var margin = {top: 20, right: 0, bottom: 0, left: 0},
      width = +rawWidth(),
      height = +rawHeight() - margin.top - margin.bottom,
      formatNumber = d3.format(",d"),
      transitioning;

    var x = d3.scaleLinear()
      .domain([0, width])
      .range([0, width]);

    var y = d3.scaleLinear()
      .domain([0, height])
      .range([0, height]);

    console.log('x', x)
    console.log('y', y)


    var treemap = d3.treemap()
      .tile(d3.treemapSquarify.ratio(height / width * 0.5 * (1 + Math.sqrt(5))))
      .padding(+padding())
      // Values are required in d3 treemap
      // and our DB table do not have values field in it, so we are going to use 1 for all nodes.
      // The value decides the size/area of rectangle in d3 treemap layout so effectively we are going to have
      // even sized rectangles
      .round(false);

    var svg = selection
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
      .style("margin-left", -margin.left + "px")
      .style("margin.right", -margin.right + "px")
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .style("shape-rendering", "crispEdges")


    var grandparent = svg.append("g")
      .attr("class", "grandparent");

    grandparent.append("rect")
      .attr("y", -margin.top)
      .attr("width", width)
      .attr("height", margin.top)
      .style("fill", function (d) { return colors()(d.color); })
      .style("stroke","#fff")

    grandparent.append("text")
      .attr("x", 6)
      .attr("y", 6 - margin.top)
      .attr("dy", ".75em");

    initialize(root);
    //throw '';
    accumulate(root);
    layout(root);
    display(root);

    function initialize(root) {
      root.x0 = root.y1 = 0;
      root.x1 = root.x0 + width;
      root.y0 = root.y1 + height;
      root.depth = 0;
      console.log('rooot', root)
    }

    // Aggregate the values for internal nodes. This is normally done by the
    // treemap layout, but not here because  of our custom implementation.
    // We also take a snapshot of the original children (_children) to avoid
    // the children being overwritten when when layout is computed.
    function accumulate(d) {
      return (d._children = d.children)
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
    }

    // Compute the treemap layout recursively such that each group of siblings
    // uses the same size (1×1) rather than the dimensions of the parent cell.
    // This optimizes the layout for the current zoom state. Note that a wrapper
    // object is created for the parent node for each group of siblings so that
    // the parent’s dimensions are not discarded as we recurse. Since each group
    // of sibling was laid out in 1×1, we must rescale to fit using absolute
    // coordinates. This lets us use a viewport to zoom.
    function layout(d) {
      if (d._children) {
        console.log('dddd', d)
        //throw 'stop';
        var data = d3.hierarchy({_children: d._children}, function(d, depth) { return depth ? null : d._children; })
          .sum(function(d) { return 1; })
          .sort(function(a, b) { return a.value - b.value; });

        treemap(data);
        d._children.forEach(function(c) {
          // console.log(d);
          var dx = Math.abs(d.x1 - d.x0)
          var dy = Math.abs(d.y0 - d.y1)
          c.x0 = d.x0 + c.x0 * dx;
          c.y1 = d.y1 + c.y1 * dy;
          c.x1 = c.x0 + (c.x1 - c.x0)*dx;
          c.y0 = c.y1 + (c.y0 - c.y1)*dy;
          c.parent = d;
          console.log('c', c);
          console.log('c', Math.abs(d.x1 - d.x0));
          console.log('c', c.x1);
          console.log('c', c.y0);
          console.log('c', c.y1);
          layout(c);
        });
      }
    }

    function display(d) {
      grandparent
        .datum(d.parent)
        .on("click", transition)
        .select("text")
        .text(name(d));

      var g1 = svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

      var g = g1.selectAll("g")
        .data(d._children)
        .enter().append("g");

      g.filter(function(d) { return d._children; })
        .classed("children", true)
        .on("click", transition);

      g.selectAll(".child")
        .data(function(d) { return d._children || [d]; })
        .enter().append("rect")
        .attr("class", "child")
        .call(rect);

      g.append("rect")
        .attr("class", "parent")
        .call(rect)
        .append("title")
        .text(function(d) { return formatNumber(d.value); })
        .style("fill", function (d) { return colors()(d.color); })
        .style("stroke","#fff")

      g.append("text")
        .attr("y", ".75em")
        .text(function(d) { return d.name; })
        .call(text);

      function transition(d) {
        if (transitioning || !d) return;
        transitioning = true;

        var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

        // Update the domain only after entering new elements.
        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);

        // Enable anti-aliasing during the transition.
        svg.style("shape-rendering", null);

        // Draw child nodes on top of parent nodes.
        svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

        // Fade-in entering text.
        g2.selectAll("text").style("fill-opacity", 0);

        // Transition to the new view.
        t1.selectAll("text").call(text).style("fill-opacity", 0);
        t2.selectAll("text").call(text).style("fill-opacity", 1);
        t1.selectAll("rect").call(rect);
        t2.selectAll("rect").call(rect);

        // Remove the old node when the transition is finished.
        t1.remove().each("end", function() {
          svg.style("shape-rendering", "crispEdges");
          transitioning = false;
        });
      }

      return g;
    }

    function text(text) {
      text.attr("x", function(d) { return x(d.x0) + 6; })
        .attr("y", function(d) { return y(d.y1) + 6; });
    }

    function rect(rect) {
      rect.attr("x", function(d) { return d.x0; })
        .attr("y", function(d) { return d.y0; })
        .attr("width", function(d) { return d.x1 - d.x0; })
        .attr("height", function(d) { return Math.abs(d.y0 - d.y1); })
        .style("fill", function (d) { return colors()(d.color); })
        .style("stroke","#fff");
    }

    function name(d) {
      return d.parent
        ? name(d.parent) + "." + d.name
        : d.name;
    }


  })
})();