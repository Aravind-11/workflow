#ROUTE DEFINITION

class Route:
    def __init__(self, warehouse_id, zone_id, route,
                 delivery_route=None, retrieval_route=None):
        self.warehouse_id = warehouse_id
        self.zone_id = zone_id
        self.route = route
        self.delivery_route = delivery_route or route
        self.retrieval_route = retrieval_route or route

    def get_route(self):
        return self.delivery_route


class Routes:
    def __init__(self):
        self.routes: list[dict] = []

    def add_delivery_route(self, warehouse_id, zone_id, route):
        self.routes.append({
            "route": route,
            "warehouse_id": warehouse_id,
            "zone_id": zone_id,
        })

    def get_routes_for_warehouse(self, warehouse_id):
        return [r for r in self.routes if r["warehouse_id"] == warehouse_id]