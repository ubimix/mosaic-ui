(function(context) {
    var Mosaic = context.Mosaic;

    describe('Mosaic.UtfGrid', function() {
        it('Should calculate right order of tiles for loading', function() {
            function test(min, max, control) {
                var grid = new Mosaic.MapTiles.UtfGrid({});
                min = grid._newPoint(min);
                max = grid._newPoint(max);
                var queue = grid._getTilesReferencesFromCenterOut(min, max);
                var val = _.map(control, function(a) {
                    return grid._newPoint(a);
                });
                expect(val.length).to.eql(control.length);
                for (var i = 0; i < val.length; i++) {
                    var a = val[i];
                    var b = control[i];
                    expect(a.x).to.eql(b[0]);
                    expect(a.y).to.eql(b[1]);
                }
            }

            test([ 0, 0 ], [ 0, 2 ], [ [ 0, 1 ], [ 0, 0 ], [ 0, 2 ] ]);
            test([ 0, 0 ], [ 3, 3 ],
                    [ [ 1, 1 ], [ 2, 1 ], [ 1, 2 ], [ 2, 2 ], [ 1, 0 ],
                            [ 3, 1 ], [ 2, 0 ], [ 0, 2 ], [ 0, 1 ], [ 3, 2 ],
                            [ 1, 3 ], [ 2, 3 ], [ 0, 3 ], [ 0, 0 ], [ 3, 0 ],
                            [ 3, 3 ] ]);
        });
        it('Should parse UTFGrid datastructures', function() {
            var tile = getTestTile();
            var resolution = 4;
            var grid = new Mosaic.MapTiles.UtfGrid({});
            var y = 0 * resolution; // first line
            var x = 63 * resolution; // last cell
            var data = grid._getTileObject(tile, grid._newPoint(x, y));
            expect(data).to.eql({
                'admin' : 'Spain'
            });
        });
    });

    function getTestTile() {
        return {
            "grid" : [
                    "                                                    !!!#########",
                    "                                                    !!!#########",
                    "                                                   !!!!#########",
                    "                                                   !!!##########",
                    "                        !!                         !!!##########",
                    "                                                    !!!#########",
                    "                                                    !!######### ",
                    "                            !                      !!! #######  ",
                    "                                                       ###      ",
                    "                                                        $       ",
                    "                                                        $$    %%",
                    "                                                       $$$$$$$%%",
                    "                                                       $$$$$$$%%",
                    "                                                     $$$$$$$$$%%",
                    "                                                    $$$$$$$$$$%%",
                    "                                                   $$$$$$$$$$$$%",
                    "                                                   $$$$$$$$$%%%%",
                    "                                                  $$$$$$$$$%%%%%",
                    "                                                  $$$$$$$$%%%%%%",
                    "                                                  $$$$$$$%%%%%%%",
                    "                                                  $$$$%%%%%%%%%%",
                    "                                                 $$$$%%%%%%%%%%%",
                    "                                        # # #  $$$$$%%%%%%%%%%%%",
                    "                                             $$$$$$$%%%%%%%%%%%%",
                    "                                             $$$&&&&'%%%%%%%%%%%",
                    "                                            $$$$&&&&'''%%%%%%%%%",
                    "                                           $$$$'''''''''%%%%%%%%",
                    "                                           $$$$'''''''''''%%%%%%",
                    "                                          $$$$&''''''''((((%%%%%",
                    "                                          $$$&&''''''''(((((%%%%",
                    "                                         $$$&&'''''''''(((((((%%",
                    "                                         $$$&&''''''''''(((((((%",
                    "                                        $$$&&&''''''''''((((((((",
                    "                                        ''''''''''''''''((((((((",
                    "                                         '''''''''''''''((((((((",
                    "                                         '''''''''''''''((((((((",
                    "                                         '''''''''''''''((((((((",
                    "                                         '''''''''''''''((((((((",
                    "                                         '''''''''''''''((((((((",
                    "                            )            '''''''''''''''((((((((",
                    "                                         ***'''''''''''''(((((((",
                    "                                         *****'''''''''''(((((((",
                    "                              ))        ******'''(((((((((((((((",
                    "                                        *******(((((((((((((((++",
                    "                                        *******(((((((((((((++++",
                    "                                        ********((((((((((((++++",
                    "                                        ***,,-**((((((((((++++++",
                    "                                         ,,,,-------(((((+++++++",
                    "                                         ,,---------(((((+++++.+",
                    "                                            --------(((((+++....",
                    "                                             -///----0000000....",
                    "                                             ////----0000000....",
                    "                                             /////1---0000000...",
                    "                                              ///11--0000000....",
                    "                                                111110000000....",
                    "                                                 11110000000....",
                    "                                                  1111000000....",
                    "                                                    1100     .  ",
                    "                                                                ",
                    "                                                                ",
                    "                                                                ",
                    "                                                                ",
                    "                                                                ",
                    "                                                                " ],
            "keys" : [ "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
                    "11", "12", "13", "14", "15", "16" ],
            "data" : {
                "1" : {
                    "admin" : "Portugal"
                },
                "2" : {
                    "admin" : "Spain"
                },
                "3" : {
                    "admin" : "Morocco"
                },
                "4" : {
                    "admin" : "Algeria"
                },
                "5" : {
                    "admin" : "Western Sahara"
                },
                "6" : {
                    "admin" : "Mauritania"
                },
                "7" : {
                    "admin" : "Mali"
                },
                "8" : {
                    "admin" : "Cape Verde"
                },
                "9" : {
                    "admin" : "Senegal"
                },
                "10" : {
                    "admin" : "Burkina Faso"
                },
                "11" : {
                    "admin" : "Guinea Bissau"
                },
                "12" : {
                    "admin" : "Guinea"
                },
                "13" : {
                    "admin" : "Ghana"
                },
                "14" : {
                    "admin" : "Sierra Leone"
                },
                "15" : {
                    "admin" : "Ivory Coast"
                },
                "16" : {
                    "admin" : "Liberia"
                }
            }
        };
    }

})(this);