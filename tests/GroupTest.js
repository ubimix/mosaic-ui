var expect = chai.expect;

describe("Mosaic.Group", function() {
    it("should be able to add/remove entities and notify about it", function() {
        var group = new Mosaic.Group();
        var added = [];
        var removed = [];
        group.on('add', function(ev) {
            added.push(ev);
        })
        group.on('remove', function(ev) {
            removed.push(ev);
        })
        group.add('abc', 'ABC');
        checkEql(added, [ {
            key : 'abc',
            item : 'ABC',
            active : undefined
        } ])
        checkEql(removed, []);

        group.add('cde', 'CDE');
        checkEql(added, [ {
            key : 'abc',
            item : 'ABC',
            active : undefined
        }, {
            key : 'cde',
            item : 'CDE',
            active : undefined
        } ]);
        checkEql(removed, []);

        group.add('efg', 'EFG');
        checkEql(added, [ {
            key : 'abc',
            item : 'ABC',
            active : undefined
        }, {
            key : 'cde',
            item : 'CDE',
            active : undefined
        }, {
            key : 'efg',
            item : 'EFG',
            active : undefined
        } ]);

        checkEql(removed, []);
        checkEql(group.get('abc'), 'ABC');
        checkEql(group.get('cde'), 'CDE');
        checkEql(group.get('efg'), 'EFG');
        checkEql(group.get('cde1'), null);

        group.remove('cde');
        checkEql(group.getAllSlots(), [ {
            key : 'abc',
            item : 'ABC',
            active : undefined
        }, {
            key : 'efg',
            item : 'EFG',
            active : undefined
        } ]);
        checkEql(removed, [ {
            key : 'cde',
            item : 'CDE',
            active : undefined
        } ]);

        group.remove('efg');
        checkEql(group.getAllSlots(), []);
        checkEql(removed, [ {
            key : 'cde',
            item : 'CDE',
            active : undefined
        }, {
            key : 'efg',
            item : 'EFG',
            active : undefined
        } ]);
    });

    it("should be able to activate/deactivate entities", function() {
        var group = new Mosaic.Group();
        var activated = [];
        var deactivated = [];
        var stats = undefined;
        group.on('activate', function(ev) {
            activated.push(ev);
        });
        group.on('update', function(s) {
            stats = s;
        });
        group.on('deactivate', function(ev) {
            deactivated.push(ev);
        });
        group.addAll({
            abc : 'ABC',
            cde : 'CDE',
            efg : 'EFG'
        });
        group.activate('abc');
        checkEql(activated, [ {
            key : 'abc',
            item : 'ABC',
            active : true
        } ])
        checkEql(deactivated, []);
        checkEql(stats, {
            'active' : [ 'abc' ],
            'inactive' : [],
            'all' : [ 'abc', 'cde', 'efg' ]
        });

        group.activate('cde');
        checkEql(activated, [ {
            key : 'abc',
            item : 'ABC',
            active : true
        }, {
            key : 'cde',
            item : 'CDE',
            active : true
        } ])
        checkEql(deactivated, []);
        checkEql(stats, {
            'active' : [ 'abc', 'cde' ],
            'inactive' : [],
            'all' : [ 'abc', 'cde', 'efg' ]
        });

        group.activate('efg');
        checkEql(activated, [ {
            key : 'abc',
            item : 'ABC',
            active : true
        }, {
            key : 'cde',
            item : 'CDE',
            active : true
        }, {
            key : 'efg',
            item : 'EFG',
            active : true
        } ])
        checkEql(deactivated, []);
        checkEql(stats, {
            'active' : [ 'abc', 'cde', 'efg' ],
            'inactive' : [],
            'all' : [ 'abc', 'cde', 'efg' ]
        });

        group.deactivate();
        checkEql(activated, [ {
            key : 'abc',
            item : 'ABC',
            active : false
        }, {
            key : 'cde',
            item : 'CDE',
            active : false
        }, {
            key : 'efg',
            item : 'EFG',
            active : false
        } ])
        checkEql(deactivated, [ {
            key : 'abc',
            item : 'ABC',
            active : false
        }, {
            key : 'cde',
            item : 'CDE',
            active : false
        }, {
            key : 'efg',
            item : 'EFG',
            active : false
        } ]);
        checkEql(stats, {
            'active' : [],
            'inactive' : [ 'abc', 'cde', 'efg' ],
            'all' : [ 'abc', 'cde', 'efg' ]
        });
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
