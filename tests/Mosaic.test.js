var expect = chai.expect;

describe("Mosaic.DataSet", function() {
    describe("notifications", function() {

        var options = {};
        var dataSet;
        beforeEach(function() {
            dataSet = new Mosaic.DataSet(options);
        })

        it("should have notify about new types of events", function() {
            var options = {};
            var dataSet = new Mosaic.DataSet(options);
            expect(dataSet).not.to.be.eql(null);
        });

        it("should be able to create new events", function() {
            var myResource = {};
            var event = dataSet.newEvent({
                resource : myResource
            })
            expect(event).not.to.be.eql(null);
            expect(event.priority).not.to.be.eql(undefined);
            expect(event.priority).to.be.eql(0);

            myResource = {};
            event = dataSet.newEvent({
                resource : myResource,
                priority : 123
            })
            expect(event.priority).to.be.eql(123);
        });

        it("should contain activateResource/deactivateResource methods",
                function() {
                    expect(_.isFunction(dataSet.activateResource)).to.be
                            .eql(true);
                    expect(_.isFunction(dataSet.deactivateResource)).to.be
                            .eql(true);
                });

        it("should be able to activate/deactivate resources", function() {
            var priority;
            var expectedPriority;
            dataSet.on('activateResource', function(event) {
                expect(event).not.to.be.eql(null);
                expect(event.priority).to.be.eql(expectedPriority);
                priority = event.priority;
            })

            priority = undefined;
            expectedPriority = 2;
            expect(priority).to.be.eql(undefined);
            dataSet.activateResource(dataSet.newEvent({
                resource : {
                    'msg' : 'Hello'
                }
            }));
            expect(priority).to.be.eql(expectedPriority);

            // A new event with a bigger priority should be delivered to all
            // listeners
            priority = undefined;
            expectedPriority = 5;
            expect(priority).to.be.eql(undefined);
            var firstResource = {
                id : 123
            };
            var secondResource = {
                'msg' : 'Hello'
            };
            dataSet.activateResource(dataSet.newEvent({
                resource : firstResource,
                priority : expectedPriority
            }));
            expect(priority).to.be.eql(expectedPriority);

            // A new event with a smaller priority should be ignored
            priority = undefined;
            expectedPriority = 3;
            expect(priority).to.be.eql(undefined);
            dataSet.activateResource(dataSet.newEvent({
                resource : secondResource,
                priority : expectedPriority
            }));
            expect(priority).to.be.eql(undefined);

            var deactivated = undefined;
            dataSet.on('deactivateResource', function(event) {
                deactivated = event.resource;
            })
            dataSet.deactivateResource(dataSet.newEvent({
                resource : firstResource
            }));
            expect(deactivated).to.be.eql(firstResource);

            // Now the current priority should be reset
            dataSet.activateResource(dataSet.newEvent({
                // resource : secondResource,
                resource : {},
                priority : expectedPriority
            }));
            expect(priority).to.be.eql(expectedPriority);
        });
    });
});