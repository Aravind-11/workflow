#SAFE PATH CONTROL

class Geofencing:
    def __init__(self, safe_paths, zone_id, warehouse_id):
        self.safe_paths = safe_paths  # list of allowed commands/paths
        self.zone_id = zone_id
        self.warehouse_id = warehouse_id

    def is_safe_path(self, command):
        if command in self.safe_paths:
            return True
        return False