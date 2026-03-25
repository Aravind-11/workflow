#JOTSTICK CONTROL

class Joystick:
    def __init__(self, id, warehouse_id):
        self.id = id
        self.warehouse_id = warehouse_id

    def send_command(self, command):
        return command


class Joysticks:
    def __init__(self):
        self.joysticks: dict[str, Joystick] = {}

    def add_joystick(self, id, warehouse_id):
        js = Joystick(id, warehouse_id)
        self.joysticks[id] = js
        return js

    def del_joystick(self, id):
        return self.joysticks.pop(id, None)

    def get_joystick(self, id):
        return self.joysticks.get(id)