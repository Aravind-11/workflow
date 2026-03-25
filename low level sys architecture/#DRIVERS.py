#DRIVERS

class Driver:
    def __init__(self, name, location, identity_id, id_no):
        self.name = name
        self.location = location
        self.identity_id = identity_id
        self.id_no = id_no

    def get_driver_details(self):
        return {
            "name": self.name,
            "location": self.location,
            "identity_id": self.identity_id,
            "id_no": self.id_no,
        }


class Drivers:
    def __init__(self):
        self.drivers = []
        self.driver_warehouse_list = []

    def add_driver_warehouse(self, driver: Driver, warehouse: Warehouse):
        self.drivers.append({"driver": driver, "warehouse": warehouse})
        self.driver_warehouse_list.append({
            "driver": driver,
            "warehouse_id": warehouse.get_id(),
        })

    def get_list(self, warehouse_id):
        return [
            entry["driver"]
            for entry in self.driver_warehouse_list
            if entry["warehouse_id"] == warehouse_id
        ]
