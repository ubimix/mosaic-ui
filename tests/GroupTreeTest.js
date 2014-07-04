var expect = chai.expect;

describe('Mosaic.GroupTree', function() {
    it('a subtree should propagate its status to parents', function() {
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

    it('should be able to find a sub-nodes by their keys', function() {
        var t = newTree({
            'item1' : 'Item One',
            'item2' : {
                'item1.1' : 'Item 1.1',
                'item1.2' : {
                    'item1.2.1' : 'Item 1.2.1',
                    'item1.2.2' : 'Item 1.2.2',
                    'item1.2.3' : 'Item 1.2.3',
                },
                'item1.3' : 'Item 1.3',
                'item1.4' : {
                    'item1.4.1' : 'Item 1.4.1',
                    'item1.4.2' : 'Item 1.4.2',
                    'item1.4.3' : 'Item 1.4.3',
                },
            },
            'item3' : 'Item Three',
        });
        console.log(t);
        var item = t.findItem('item1.3');
        expect(item).to.eql('Item 1.3');

        var item = t.findItem('item1.4.1');
        expect(item).not.to.eql(null);
        expect(item).to.eql('Item 1.4.1');

        var item = t.findItem('item1.4');
        expect(item).not.to.eql(null);

    });
});

function newTree(obj, exclusive) {
    var tree = new Mosaic.GroupTree({
        exclusive : !!exclusive
    });
    _.each(obj, function(value, key) {
        if (_.isObject(value)) {
            value = newTree(value);
        }
        tree.add(key, value);
    })
    return tree;
}

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
