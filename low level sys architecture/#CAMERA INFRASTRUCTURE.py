#CAMERA INFRASTRUCTURE 

class Camera:
    def __init__(self, id, location, type, warehouse_id, zone_id=None):
        self.id = id
        self.location = location
        self.type = type
        self.warehouse_id = warehouse_id
        self.zone_id = zone_id
        self._feed = None

    def get_id(self):
        return self.id

    def get_location(self):
        return self.location

    def get_type(self):
        return self.type

    def get_warehouse_id(self):
        return self.warehouse_id

    def get_feed(self):
        return self._feed

    def change_zone(self, new_zone_id):
        old = self.zone_id
        self.zone_id = new_zone_id
        return old


class Cameras:
    def __init__(self):
        self.cameras: list[Camera] = []

    def add_camera(self, id, location, type, warehouse_id, zone_id=None):
        cam = Camera(id, location, type, warehouse_id, zone_id)
        self.cameras.append(cam)
        return cam

    def remove_camera(self, id, location):
        for cam in self.cameras:
            if cam.id == id and cam.location == location:
                self.cameras.remove(cam)
                return True
        return False

    def get_camera_feed(self, id, location):
        for cam in self.cameras:
            if cam.id == id and cam.location == location:
                return cam.get_feed()
        return None

    def change_camera_zone(self, id, location, new_zone_id):
        for cam in self.cameras:
            if cam.id == id and cam.location == location:
                return cam.change_zone(new_zone_id)
        return None