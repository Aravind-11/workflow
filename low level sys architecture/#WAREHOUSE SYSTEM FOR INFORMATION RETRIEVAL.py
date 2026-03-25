#WAREHOUSE SYSTEM FOR INFORMATION RETRIEVAL

class Warehouse:
    def __init__(self, id, location, workers=None, deliveries=None,
                 schedule=None, retrieval=None):
        self.id = id
        self.location = location
        self.workers = workers or []
        self.deliveries = deliveries or []
        self.schedule = schedule or {}
        self.retrieval = retrieval or []

    def get_id(self):
        return self.id

    def get_deliveries(self):
        return self.deliveries

    def get_retrieval(self):
        return self.retrieval