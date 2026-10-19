USE campus_lost_found;

INSERT INTO ITEM_CATEGORIES (category_name) VALUES
  ('Electronics'), ('Clothing & Accessories'), ('Bags'), ('ID Cards'),
  ('Books & Stationery'), ('Keys'), ('Other')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

INSERT INTO LOCATIONS (location_name) VALUES
  ('Library'), ('Main Canteen'), ('Engineering Block'), ('Lecture Hall'),
  ('Sports Complex'), ('Administration Block'), ('Hostel'), ('Parking Area')
ON DUPLICATE KEY UPDATE location_name = VALUES(location_name);
