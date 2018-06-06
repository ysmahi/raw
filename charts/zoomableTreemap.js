(function(){

    var tree = raw.models.tree();

    var chart = raw.chart()
        .title('Zoomable Treemap')
        .description(
        "A space filling visualization of data hierarchies and proportion between elements. The different hierarchical levels create visual clusters through the subdivision into rectangles proportionally to each element's value. Treemaps are useful to represent the different proportion of nested hierarchical data structures.<br/>Based on <a href='http://bl.ocks.org/mbostock/4063582'>http://bl.ocks.org/mbostock/4063582</a>")
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

        console.log(padding());
        console.log(+padding());
        var treemap = d3.layout.treemap()
            .padding(+padding())
            .children(function(d, depth) { return depth ? null : d._children; })
            .sort(function(a, b) { return a.value - b.value; })
            .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
            // Values are required in d3 treemap layout
            // and our DB table do not have values field in it, so we are going to use 1 for all nodes.
            // The value decides the size/area of rectangle in d3 treemap layout so effectively we are going to have
            // even sized rectangles
            .value(function(d) { return 1; })
            .round(false);

        var svg = selection
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top)
            .style("margin-left", -margin.left + "px")
            .style("margin.right", -margin.right + "px")
            .append("g")
            // transform in that case enables to translate the element
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
            //console.log(root);
            //throw '';
            accumulate(root);
            layout(root);
            display(root);

            function initialize(root) {
                root.x = root.y = 0;
                root.dx = width;
                root.dy = height;
                root.depth = 0;
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
                // adds to d (parent) information about children
                if (d._children) {
                    //console.log(d);
                    //throw 'stop';
                    treemap.nodes({_children: d._children});
                    d._children.forEach(function(c) {
                        // console.log('parent (d)', d);
                        c.x = d.x + c.x * d.dx;
                        c.y = d.y + c.y * d.dy;
                        c.dx *= d.dx;
                        c.dy *= d.dy;
                        c.parent = d;
                        // console.log('child (c)', c);
                        layout(c);
                    });
                }
            }

            function display(d) {
                // d is the elemetn on what we click (or the whole map on first display)
                // console.log('dddd', d);
                // console.log('dparent', d.parent);
                // Define grandparent element (parent of d), we bind grandparent tree to that element
                grandparent
                    .datum(d.parent)
                    .on("click", transition)
                    .select("text")
                    .text(name(d));

                // create an svg element bound to clicked element (d) data, insert it before grandparent element
                // Returns selection of the created element, so now stored in g1
                var g1 = svg.insert("g", ".grandparent")
                    .datum(d)
                    .attr("class", "depth");

                // Attach children data to g (currently g bound to d data)
                // Appends g elements to the existing one created above
                // Number of g elements = number of children
                // After those lines, g = selection of parent (d) + his children (d's children)
                var g = g1.selectAll("g")
                    .data(d._children)
                    .enter().append("g");

                // Attach onClick transition to all g selection elements who have children
                // So that when you click on them, a zoom transition is performed
                // Classed() assigns 'children' class to selected elements who have children
                g.filter(function(d) { return d._children; })
                    .classed("children", true)
                    .on("click", transition);

                // selectAll(".child") returns empty array if ever no existing child
                g.selectAll(".child")
                // function returns d's children or d himself (if no children)
                // Appends rectangle svg element to each bound element
                    .data(function(d) { return d._children || [d]; })
                    .enter().append("rect")
                    .attr("class", "child")
                    .call(rect);
                    // mySelection.call : Invoke a function, passing the selection and returning it.

                g.append("rect")
                    .attr("class", "parent")
                    .call(rect)
                    .append("title")
                    .text(function(d) { return formatNumber(d.value); })
                    .style("fill", function (d) { return colors()(d.color); })
                    .style("stroke","#fff")

                g.append("text")
                    .attr("dy", ".75em")
                    .text(function(d) { return d.name; })
                    .call(text);

                function transition(d) {
                    if (transitioning || !d) return;
                    transitioning = true;

                    var g2 = display(d),
                        t1 = g1.transition().duration(750),
                        t2 = g2.transition().duration(750);

                    // Update the domain only after entering new elements.
                    x.domain([d.x, d.x + d.dx]);
                    y.domain([d.y, d.y + d.dy]);

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
                console.log('aaa', text);
                text.attr("x", function(d) { console.log('xx', x); console.log('xxxxx', x(d.x)); return x(d.x) + 6; })
                    .attr("y", function(d) { return y(d.y) + 6; });
            }

            function rect(rect) {
                rect.attr("x", function(d) { return x(d.x); })
                    .attr("y", function(d) { return y(d.y); })
                    .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
                    .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
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