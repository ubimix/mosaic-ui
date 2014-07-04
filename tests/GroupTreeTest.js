var expect = chai.expect;

describe('Mosaic.GroupTree', function() {

    var TestNode = Mosaic.TreeNode.extend(Mosaic.TreeNodeStatusMixin)
    var TestNodeExclusive = TestNode.extend({});

    it('should be able to find a sub-nodes by their keys', function() {
        var tree = createTree(TestNode);
        var item = tree.find('item1.3');
        expect(item).not.to.eql(undefined);
        expect(item.value).to.eql('Item 1.3');

        var item = tree.find('item1.4.1');
        expect(item).not.to.eql(null);
        expect(item.value).to.eql('Item 1.4.1');

        var item = tree.find('item1.4');
        expect(item).not.to.eql(null);
        expect(item.value).not.to.eql('Item 1.4');
    });

    it('a subtree should propagate event about new nodes', function() {
        var tree = createTree(TestNode);
        var addEvt = null;
        tree.on('add', function(e) {
            addEvt = e;
        })
        var node = tree.find('item1.4.1');
        var newItem = node.get('toto', true);
        expect(newItem).not.to.eql(null);
        expect(newItem.getKey()).to.eql('toto');
        expect(newItem.getParent()).to.eql(node);
        expect(addEvt).not.to.eql(null);
        expect(addEvt.node).to.eql(newItem);
    });

    it('a subtree should propagate its status to parents', function() {
        var tree = createTree(TestNode);
        var evt;
        tree.on('status', function(e) {
            evt = e;
        })
        var node = tree.find('item1.4.1');
        node.setStatus('active');
        expect(evt).not.eql(null)
        expect(evt.node).eql(node);
        expect(evt.node.getStatus()).to.eql('active');
        expect(evt.prevStatus).to.eql('inactive');
        node.setStatus('inactive');
        expect(evt).not.to.eql(null)
        expect(evt.node).to.eql(node);
        expect(evt.node.getStatus()).to.eql('inactive');
        expect(evt.prevStatus).to.eql('active');
    });

    it('should be able to active just one node at time', function() {
        var tree = createTree(TestNodeExclusive);
        var item_1_4 = tree.find('item1.4');
        var item_1_4_1 = tree.find('item1.4.1');
        var item_1_4_2 = tree.find('item1.4.2');
        var item_1_2 = tree.find('item1.2');
        var item_1_2_1 = tree.find('item1.2.1');
        var item_1_2_2 = tree.find('item1.2.2');

        item_1_4_1.setStatus('active');
        expect(item_1_4.getStatus()).to.eql('active');
        expect(item_1_4_1.getStatus()).to.eql('active');
        expect(item_1_4_2.getStatus()).to.eql('inactive');
        expect(item_1_2.getStatus()).to.eql('inactive');
        expect(item_1_2_1.getStatus()).to.eql('inactive');
        expect(item_1_2_2.getStatus()).to.eql('inactive');

        item_1_4_2.setStatus('active');
        expect(item_1_4.getStatus()).to.eql('active');
        expect(item_1_4_1.getStatus()).to.eql('inactive');
        expect(item_1_4_2.getStatus()).to.eql('active');
        expect(item_1_2.getStatus()).to.eql('inactive');
        expect(item_1_2_1.getStatus()).to.eql('inactive');
        expect(item_1_2_2.getStatus()).to.eql('inactive');

        item_1_2_2.setStatus('active');
        expect(item_1_4.getStatus()).to.eql('inactive');
        expect(item_1_4_1.getStatus()).to.eql('inactive');
        expect(item_1_4_2.getStatus()).to.eql('active');
        expect(item_1_2.getStatus()).to.eql('active');
        expect(item_1_2_1.getStatus()).to.eql('inactive');
        expect(item_1_2_2.getStatus()).to.eql('active');

        item_1_2_1.setStatus('active');
        expect(item_1_4.getStatus()).to.eql('inactive');
        expect(item_1_4_1.getStatus()).to.eql('inactive');
        expect(item_1_4_2.getStatus()).to.eql('active');
        expect(item_1_2.getStatus()).to.eql('active');
        expect(item_1_2_1.getStatus()).to.eql('active');
        expect(item_1_2_2.getStatus()).to.eql('inactive');
    });

});

function createTree(Type) {
    return newTree(Type, {
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
}
function newTree(Type, obj) {
    var tree = new Type({});
    addChildren(tree, obj);
    return tree;
}
function addChildren(node, obj) {
    _.each(obj, function(value, key) {
        var child = node.get(key, true);
        child.value = value;
        if (_.isObject(value)) {
            addChildren(child, value);
        }
    })
}
