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
        expect(added).to.eql([ {
            key : 'abc',
            item : 'ABC',
            active : undefined
        } ]);
        expect(removed).to.eql([]);

        group.add('cde', 'CDE');
        expect(added).to.eql([ {
            key : 'abc',
            item : 'ABC',
            active : undefined
        }, {
            key : 'cde',
            item : 'CDE',
            active : undefined
        } ]);
        expect(removed).to.eql([]);

        expect(group.get('abc')).to.eql('ABC');
        expect(group.get('cde')).to.eql('CDE');
        expect(group.get('cde1')).to.eql(null);

        group.remove('abc');
        expect(group.getAll()).to.eql([ {
            key : 'cde',
            item : 'CDE',
            active : undefined
        } ]);
        expect(removed).to.eql([ {
            key : 'abc',
            item : 'ABC',
            active : undefined
        } ]);

        group.remove('cde');
        expect(group.getAll()).to.eql([]);
        expect(removed).to.eql([ {
            key : 'abc',
            item : 'ABC',
            active : undefined
        }, {
            key : 'cde',
            item : 'CDE',
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
        expect(activated).to.eql([ {
            key : 'abc',
            item : 'ABC',
            active : true
        } ])
        expect(deactivated).to.eql([]);
        expect(stats).to.eql({
            'active' : [ 'abc' ],
            'inactive' : [],
            'undefined' : [ 'cde', 'efg' ],
            'all' : [ 'abc', 'cde', 'efg' ]
        });

        group.activate('cde');
        expect(activated).to.eql([ {
            key : 'abc',
            item : 'ABC',
            active : true
        }, {
            key : 'cde',
            item : 'CDE',
            active : true
        } ])
        expect(deactivated).to.eql([]);
        expect(stats).to.eql({
            'active' : [ 'abc', 'cde' ],
            'inactive' : [],
            'undefined' : [ 'efg' ],
            'all' : [ 'abc', 'cde', 'efg' ]
        });

        group.activate('efg');
        expect(activated).to.eql([ {
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
        expect(deactivated).to.eql([]);
        expect(stats).to.eql({
            'active' : [ 'abc', 'cde', 'efg' ],
            'inactive' : [],
            'undefined' : [],
            'all' : [ 'abc', 'cde', 'efg' ]
        });

        group.deactivate();
        expect(activated).to.eql([ {
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
        expect(deactivated).to.eql([ {
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
        expect(stats).to.eql({
            'active' : [],
            'inactive' : [ 'abc', 'cde', 'efg' ],
            'undefined' : [],
            'all' : [ 'abc', 'cde', 'efg' ]
        });

    });

});
