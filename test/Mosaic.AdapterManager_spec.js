(function(context) {
    var Mosaic = context.Mosaic;

    describe('Mosaic.AdapterManager', function() {

        it('Mosaic.AdapterManager.getTypeId', function() {
            expect(Mosaic.AdapterManager.getTypeId('abc')).to.eql('abc');
            var FirstType = Mosaic.Class.extend();

            var typeId = Mosaic.AdapterManager.getTypeId(FirstType);
            expect(!!typeId).to.eql(true);

            var SecondType = Mosaic.Class.extend({
                type : 'SecondType'
            });
            expect(Mosaic.AdapterManager.getTypeId(SecondType)).//
            to.eql('SecondType');

        });

        it('should be able to register/remove static adapters', function() {
            var m = new Mosaic.AdapterManager();
            expect(!!m.getAdapter('a', 'b')).to.eql(false);
            m.registerAdapter('a', 'b', 'C');
            expect(m.getAdapter('a', 'b')).to.eql('C');
            m.removeAdapter('a', 'b');
            expect(!!m.getAdapter('a', 'b')).to.eql(false);
        });

        it('should be able to use static instance ' + //
        'in the newAdapterInstance method', function() {
            var m = new Mosaic.AdapterManager();
            var result = m.newAdapterInstance('a', 'b');
            expect(!!result).to.eql(false);
            var Type = Mosaic.Class.extend();
            m.registerAdapter('a', 'b', Type);
            result = m.newAdapterInstance('a', 'b');
            expect(!!result).to.eql(true);
            expect(Type.hasInstance(result)).to.eql(true);
        });

        it('should be able to register adapters for two types', function() {
            var m = new Mosaic.AdapterManager();
            var FirstType = Mosaic.Class.extend({});
            var SecondType = Mosaic.Class.extend({});
            var ThirdType = Mosaic.Class.extend({});

            expect(!!m.getAdapter(FirstType, SecondType)).to.eql(false);

            m.registerAdapter(FirstType, SecondType, ThirdType);

            expect(m.getAdapter(FirstType, SecondType)).to.eql(ThirdType);
            var result = m.newAdapterInstance(FirstType, SecondType);
            expect(!!result).to.eql(true);
            expect(ThirdType.hasInstance(result)).to.eql(true);

            m.removeAdapter(FirstType, SecondType);

            expect(!!m.getAdapter(FirstType, SecondType)).to.eql(false);
            result = m.newAdapterInstance(FirstType, SecondType);
            expect(!!result).to.eql(false);
        });

    });

})(this);