var express = require("express");
var router = express.Router();
const { connectToDB, ObjectId } = require("../utils/db");
const { name } = require("ejs");
const { CATEGORIES, STATUSES } = require("../cateogry/event_category.js");
const { FACILITIES_ENUM } = require("../cateogry/venue_category.js");
/* GET home page. */
router.get("/", async function (req, res, next) {
  try {
    const db = await connectToDB();

    let rawHighlighted = await db
      .collection("events")
      .find({ isHighlighted: true })
      .toArray();
    let rawUpcoming = await get_upcoming_event(db);
    let rawTrending = await get_trending_events(db);

    const [highlighted, upcoming, trending] = await Promise.all([
      enrich_event_details(db, rawHighlighted),
      enrich_event_details(db, rawUpcoming),
      enrich_event_details(db, rawTrending),
    ]);

    res.render("index", {
      highlightedBookings: highlighted,
      upcoming_events: upcoming,
      trending_events: trending,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/highlight", async function (req, res, next) {
  const db = await connectToDB();
  try {
    let highlighted = await db
      .collection("events")
      .find({ isHighlighted: true })
      .toArray();

    res.json(highlighted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function get_venue_by_id(db, venue_id) {
  try {
    let query = ObjectId.isValid(venue_id)
      ? { _id: new ObjectId(venue_id) }
      : { _id: venue_id };

    let target_venue = await db.collection("venues").findOne(query);

    console.log("找到的場地：", target_venue);

    return target_venue ? target_venue.name : null;
  } catch (err) {
    console.error("Error fetching venue by id:", err);
    return null;
  }
}

async function get_upcoming_event(db) {
  try {
    let upcoming_events = await db
      .collection("events")
      .find({
        status: "Upcoming",
      })
      .sort({ dateTime: 1 })
      .limit(6)
      .toArray();
    return upcoming_events;
  } catch (err) {
    console.error("Error fetching upcoming events:", err);
    return [];
  }
}

async function get_trending_events(db) {
  try {
    let trending_events = await db
      .collection("events")
      .find()
      .sort({ dateTime: -1 })
      .limit(6)
      .toArray();

    return trending_events;
  } catch (err) {
    console.error("Error fetching trending events:", err);
    return [];
  }
}

// to all event page
router.get("/events", async function (req, res) {
  try {
    const db = await connectToDB();
    const rawResults = await db.collection("events").find().toArray();
    const results = await enrich_event_details(db, rawResults);
    res.render("events", { events: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//render create event page
router.get("/events/add", async function (req, res) {
  try {
    const db = await connectToDB();
    venue = await get_venues_map(db);
    res.render("create_event", {
      Category: CATEGORIES,
      Status: STATUSES,
      venues: venue,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// post event handler
router.post("/event", async function (req, res) {
  const db = await connectToDB();
  try {
    req.body.capacity = parseInt(req.body.capacity);
    req.body.isHighlighted = req.body.isHighlighted ? true : false;
    const venueName = req.body.venue;

    const venueRecord = await db
      .collection("venues")
      .findOne({ name: venueName });
    if (venueRecord) {
      req.body.venue = venueRecord._id;
    }

    let result = await db.collection("events").insertOne(req.body);
    res.redirect(`/event/detail/${result.insertedId}`);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/event/detail/:id", async function (req, res) {
  const db = await connectToDB();
  try {
    let target_event = await find_by_id(db, req.params.id, "events");

    if (!target_event) {
      return res.status(404).json({ message: "event id not found" });
    }

    const venueName = await get_venue_by_id(db, target_event.venue);
    const venueRecord = target_event.venue
      ? await db.collection("venues").findOne({ _id: target_event.venue })
      : null;

    target_event.venueName = venueName || "TBD";
    target_event.venueLocation = venueRecord ? venueRecord.location : "";
    target_event.formattedDate = await formatted_Date(target_event.dateTime);

    res.render("event_detail", { event: target_event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//edit event page
router.get("/event/edit/:id", async function (req, res) {
  const db = await connectToDB();
  try {
    const get_event = await find_by_id(db, req.params.id, "events");

    if (!get_event) {
      res.status(404).json({ message: "id not found" });
    } else {
      const venues = await get_venues_map(db);
      const venue_name = await get_venue_by_id(db, get_event.venue);
      res.render("edit_event", {
        Facilities: FACILITIES_ENUM,
        event: get_event,
        venues: venues,
        Category: CATEGORIES,
        Status: STATUSES,
        venue_name: venue_name,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// update event
router.post("/event/edit/:id", async function (req, res) {
  const db = await connectToDB();
  try {
    const eventId = req.params.id;

    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "invalid event id format" });
    }
    let venueId = null;
    if (req.body.venue && req.body.venue.trim() !== "") {
      venueId = new ObjectId(req.body.venue);
    }

    const updatedData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      dateTime: req.body.dateTime,
      speaker: req.body.speaker,
      capacity: parseInt(req.body.capacity, 10),
      venue: venueId,
      status: req.body.status,
      bannerImage: req.body.bannerImage,
      isHighlighted: req.body.isHighlighted === "true",
    };

    const result = await db
      .collection("events")
      .updateOne({ _id: new ObjectId(eventId) }, { $set: updatedData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "event id not found" });
    }

    res.redirect(`/event/detail/${eventId}`);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/event/delete/:id", async function (req, res) {
  const db = await connectToDB();
  try {
    const eventId = req.params.id;

    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "invalid event id format" });
    }

    const result = await db
      .collection("events")
      .deleteOne({ _id: new ObjectId(eventId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "event id not found" });
    }

    res.redirect("/events");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------------------------------------------------   start of venue
// to all venue page
router.get("/venues", async function (req, res) {
  const db = await connectToDB();
  try {
    let results = await db.collection("venues").find().toArray();
    res.render("venues", { venues: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//create venue page
router.get("/venue/add", async function (req, res) {
  try {
    res.render("create_venue", {
      Facilities: FACILITIES_ENUM,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//post venue handler
router.post("/venue", async function (req, res) {
  const db = await connectToDB();
  try {
    req.body.capacity = parseInt(req.body.capacity);

    // ensure the facilities is always an array even there is only one facility
    if (req.body.facilities) {
      if (!Array.isArray(req.body.facilities)) {
        req.body.facilities = [req.body.facilities];
      }
    } else {
      req.body.facilities = [];
    }

    let result = await db.collection("venues").insertOne(req.body);

    res.redirect("/venues");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//edit venue page
router.get("/venue/edit/:id", async function (req, res) {
  const db = await connectToDB();
  try {
    const get_venue = await find_by_id(db, req.params.id, "venues");
    if (!get_venue) {
      res.status(404).json({ message: "id not found" });
    } else {
      const venue = res.render("edit_venue", {
        Facilities: FACILITIES_ENUM,
        venue: get_venue,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update venue handler
router.post("/venue/:id", async function (req, res) {
  const db = await connectToDB();
  try {
    const venueId = req.params.id;

    if (!ObjectId.isValid(venueId)) {
      return res.status(400).json({ message: "invalid venue id format" });
    }

    req.body.capacity = parseInt(req.body.capacity, 10);

    if (req.body.facilities) {
      if (!Array.isArray(req.body.facilities)) {
        req.body.facilities = [req.body.facilities];
      }
    } else {
      req.body.facilities = [];
    }

    const updatedData = {
      name: req.body.name,
      location: req.body.location,
      capacity: req.body.capacity,
      description: req.body.description,
      facilities: req.body.facilities,
    };

    const result = await db
      .collection("venues")
      .updateOne({ _id: new ObjectId(venueId) }, { $set: updatedData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "venue id not found" });
    }

    res.redirect("/venues");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// delete venue handler
router.post("/venue/delete/:id", async function (req, res) {
  const db = await connectToDB();
  try {
    const venueId = req.params.id;

    if (!ObjectId.isValid(venueId)) {
      return res.status(400).json({ message: "invalid venue id format" });
    }

    const result = await db
      .collection("venues")
      .deleteOne({ _id: new ObjectId(venueId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "venue id not found" });
    }

    res.redirect("/venues");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//helper function to see if venue or event exists using their id
async function find_by_id(db, Id, type) {
  //type is either events / venues
  if (!ObjectId.isValid(Id) || (type != "venues") & (type != "events")) {
    return null;
  }

  const Object = await db.collection(type).findOne({ _id: new ObjectId(Id) });

  return Object;
}

// helper function to map venue name and format date db -> frontend
async function enrich_event_details(db, eventsArray) {
  if (!Array.isArray(eventsArray) || eventsArray.length === 0) {
    return [];
  }

  return await Promise.all(
    eventsArray.map(async (event) => {
      const venueName = await get_venue_by_id(db, event.venue);
      const formattedDate = await formatted_Date(event.dateTime);

      return {
        ...event,
        venueName: venueName || "TBD",
        formattedDate: formattedDate,
      };
    }),
  );
}

//helper function to format date
async function formatted_Date(date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function get_venues_map(db) {
  try {
    const venues = await db.collection("venues").find().toArray();

    const venueMap = new Map();
    venues.forEach((v) => {
      venueMap.set(v._id.toString(), {
        name: v.name,
        capacity: v.capacity,
        location: v.location,
      });
    });

    return venueMap;
  } catch (err) {
    console.error("Error loading venues map:", err);
    return new Map();
  }
}
module.exports = router;
