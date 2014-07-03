var expect = chai.expect;

describe("Mosaic.GroupTree", function() {
    it("a subtree should propagate its status to parents", function() {
        var tree = new Mosaic.GroupTree();
        var subtree = new Mosaic.GroupTree();
        tree.add('abc', 'ABC');
        tree.add('cde', subtree);
        tree.add('efg', 'EFG');

        subtree.add('fgk', 'FGK');
        subtree.add('gkl', 'GKL');

        var updates;
        tree.on('update', function(stats) {
            updates = stats;
        })
        subtree.activate('fgk');
        expect(updates).to.eql({
            active : [ 'cde' ],
            inactive : [],
            all : [ 'abc', 'cde', 'efg' ]
        });
        subtree.deactivate('fgk');
        expect(updates).to.eql({
            active : [],
            inactive : [ 'cde' ],
            all : [ 'abc', 'cde', 'efg' ]
        });

        var subsubtree = new Mosaic.GroupTree();
        subtree.add('klm', subsubtree);
        subsubtree.add('123', '321');
        subsubtree.add('324', '423');
        subsubtree.add('657', '756');
        subsubtree.activate('324');

        expect(updates).to.eql({
            active : [ 'cde' ],
            inactive : [],
            all : [ 'abc', 'cde', 'efg' ]
        })

    });
});

function checkEql(a, b) {
    function toString(x) {
        var result = '';
        if (!_.isArray(x))
            if (x) {
                result += x;
            } else {
                _.each(x, function(el) {
                    result += el.toString ? el.toString() : el;
                })
            }
        return result;
    }
    expect(toString(a)).to.eql(toString(b));
}
